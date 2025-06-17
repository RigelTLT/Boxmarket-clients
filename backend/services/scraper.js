const puppeteer = require("puppeteer");
const fs = require("fs");
const xlsx = require("xlsx");
const path = require("path");
const unzipper = require("unzipper");
const CONFIG = require("../config");

async function fetchExcelAndSync(db) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Авторизация
  await page.goto(CONFIG.SCRAPER.URL);
  await page.type("#Login", CONFIG.SCRAPER.LOGIN);
  await page.type("#Pass", CONFIG.SCRAPER.PASS);
  await page.click(".loginButton");
  // Ждем загрузки страницы после авторизации
  await page.waitForNavigation();

  console.log("Авторизация прошла успешно!");
  await page.waitForSelector("#mainpage\\:j_id75", {
    timeout: 5000,
  });
  // Ожидаем появления кнопки для выгрузки
  await page.click("#mainpage\\:j_id75");
  await page.waitForSelector("#containersForm\\:containersTable\\:j_id340", {
    timeout: 5000,
  }); // Ждем 5 секунд, чтобы элемент стал доступным

  // Подготовка папки для скачивания
  const tmpDir = path.resolve(__dirname, "../tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Настройка поведения загрузки через CDP
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: tmpDir,
  });

  // Ждём и скачиваем Excel
  await page.waitForSelector("#containersForm\\:containersTable\\:j_id340", {
    timeout: 20000,
  });
  const downloadedFile = await waitForDownload(
    tmpDir,
    /^ClientContainers.*\.xls$/,
    () => {
      page.click("#containersForm\\:containersTable\\:j_id340");
    }
  );
  const excelPath = path.join(tmpDir, "containers.xlsx");
  fs.renameSync(path.join(tmpDir, downloadedFile), excelPath);

  // Чтение и парсинг Excel
  const wb = xlsx.readFile(excelPath);
  const ws = wb.Sheets["Список контейнеров"];
  if (!ws) throw new Error('Sheet "Список контейнеров" not found');
  const rawData = xlsx.utils.sheet_to_json(ws, { defval: "" });
  const data = rawData.map((r) => ({
    number: r["Номер"] || r["№"],
    params: r,
  }));

  // Синхронизация с БД
  await syncContainers(data, db);

  // Скачиваем фото для каждого контейнера
  for (let i = 0; i < data.length; i++) {
    await fetchPhotosFor(page, i, data[i].number, db, tmpDir);
  }

  await browser.close();
}

// Ожидание файла в папке
async function waitForDownload(dir, regex, clickFn, timeout = 20000) {
  const start = Date.now();
  clickFn();
  return new Promise((resolve, reject) => {
    (function check() {
      const files = fs.readdirSync(dir);
      const file = files.find((f) => regex.test(f));
      if (file) return resolve(file);
      if (Date.now() - start > timeout)
        return reject(new Error("Download timeout"));
      setTimeout(check, 500);
    })();
  });
}

async function syncContainers(data, db) {
  const Container = db.model("Container");
  const incoming = data.map((d) => d.number);
  await Container.deleteMany({ number: { $nin: incoming } });
  for (const row of data) {
    await Container.findOneAndUpdate(
      { number: row.number },
      { params: row.params, updatedAt: new Date() },
      { upsert: true }
    );
  }
}

async function fetchPhotosFor(page, idx, number, db, tmpDir) {
  const axios = require("axios");
  const Container = db.model("Container");

  // Параметры пагинации и определение страницы
  const pageSize = 100;
  const targetPage = Math.floor(idx / pageSize);

  // Селектор для строки контейнера (используем абсолютный индекс)
  const rowSelector = `#containersForm\\:containersTable\\:${idx}\\:containercard`;
  console.log(idx);
  // Навигация по страницам вперед, если необходимо
  for (let p = 0; p < targetPage; p++) {
    await page.click("#containersForm\\:containersTable\\:j_id669next");
    // Ждем, когда целевая строка появится в DOM и будет готова к клику
    await page.waitForFunction(
      (sel) => !!document.querySelector(sel),
      { timeout: 20000 },
      rowSelector
    );
  }

  // Кликаем по строке контейнера
  await page.waitForSelector(rowSelector, { timeout: 20000 });
  await page.click(rowSelector);

  // Ждем появления кнопки для выгрузки фотографий
  await page.waitForFunction(
    () => Boolean(document.querySelector('[onclick*="UploadAllFiles"]')),
    { timeout: 20000 }
  );

  // Извлечение фрагмента URL для скачивания архива
  const downloadFragment = await page.evaluate(() => {
    const el = document.querySelector('[onclick*="UploadAllFiles"]');
    const onclick = el.getAttribute("onclick");
    const match = onclick.match(
      /window\.open\(document\.location\.href \+ '(.+?)'/
    );
    return match ? match[1] : null;
  });
  if (!downloadFragment) throw new Error("Download fragment not found");
  const downloadUrl = new URL(downloadFragment, page.url()).href;

  // Скачиваем архив через axios с передачей куки
  const cookies = await page.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    headers: { Cookie: cookieHeader },
  });
  if (response.status !== 200)
    throw new Error(`Failed to download archive: ${response.status}`);

  // Сохраняем и распаковываем архив
  const zipPath = path.join(tmpDir, `${number}.zip`);
  fs.writeFileSync(zipPath, response.data);
  const extractDir = path.resolve(CONFIG.CACHE_DIR, number);
  if (fs.existsSync(extractDir))
    fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractDir }))
    .promise();

  // Обновление путей к фотографиям в БД
  const files = fs
    .readdirSync(extractDir)
    .filter((f) => f.startsWith(number))
    .map((f) => path.join("cache", number, f));
  await Container.updateOne({ number }, { photos: files });

  // Возврат к списку контейнеров и навигация назад
  await page.click("#containercardform\\:linkback");
  await page.waitForSelector(
    "#containersForm\\:containersTable\\:0\\:containercard",
    { timeout: 20000 }
  );
  for (let p = 0; p < targetPage; p++) {
    await page.click("#containersForm\\:containersTable\\:j_id669previous");
    await page.waitForTimeout(500);
  }
}

module.exports = { fetchExcelAndSync };
