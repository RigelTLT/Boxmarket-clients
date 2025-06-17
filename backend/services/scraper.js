const puppeteer = require("puppeteer");
const fs = require("fs");

const xlsx = require("xlsx");
const path = require("path");
const unzipper = require("unzipper");
const CONFIG = require("../config");

async function fetchExcelAndSync(db) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  // Авторизация
  await page.goto(CONFIG.SCRAPER.URL);
  await page.type("#Login", CONFIG.SCRAPER.LOGIN);
  await page.type("#Pass", CONFIG.SCRAPER.PASS);
  await page.click(".loginButton");
  await page.waitForNavigation();

  // Переход на страницу списка и скачивание Excel
  await page.waitForSelector("#containersForm\\:containersTable\\:j_id340", {
    timeout: 5000,
  }); // Ждем 5 секунд, чтобы элемент стал доступным
  const [excelResponse] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.headers()["content-disposition"] &&
        resp.headers()["content-disposition"].includes("attachment")
    ),
    page.click("#containersForm\\:containersTable\\:j_id340"),
  ]);
  const excelBuffer = await excelResponse.buffer();
  fs.writeFileSync(filePath, excelBuffer);

  // Чтение и парсинг Excel
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws);

  // Синхронизация
  await syncContainers(data, db);

  // Скачиваем фото каждого контейнера
  for (let i = 0; i < data.length; i++) {
    const number = data[i].number;
    await fetchPhotosFor(page, i, number, db);
  }

  await browser.close();
}

async function syncContainers(data, db) {
  const Container = db.model("Container");
  const incoming = data.map((d) => d.number);
  // Удалить отсутствующие
  await Container.deleteMany({ number: { $nin: incoming } });
  // Добавить/обновить
  for (const row of data) {
    await Container.findOneAndUpdate(
      { number: row.number },
      { params: row, updatedAt: new Date() },
      { upsert: true }
    );
  }
}

async function fetchPhotosFor(page, idx, number, db) {
  const Container = db.model("Container");
  // Переход на страницу контейнера и скачивание архива с фото
  await page.click(
    `#containersForm\\:containersTable\\:${idx}\\:containercard`
  );
  await page.waitForSelector('button[onclick*="UploadAllFiles"]');
  const [photoResponse] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.headers()["content-disposition"] &&
        resp.headers()["content-disposition"].includes("attachment")
    ),
    page.click('button[onclick*="UploadAllFiles"]'),
  ]);
  const zipBuffer = await photoResponse.buffer();
  fs.writeFileSync(zipPath, zipBuffer);

  // Распаковка архива
  const extractDir = path.join(CONFIG.CACHE_DIR, number);
  // Очистка старых фото
  if (fs.existsSync(extractDir))
    fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractDir }))
    .promise();

  // Сохраняем пути фото в базе
  const files = fs
    .readdirSync(extractDir)
    .filter((f) => f.startsWith(number))
    .map((f) => path.join("cache", number, f));
  await Container.updateOne({ number }, { photos: files });

  // Назад к списку
  await page.click("#containercardform\\:linkback");
}

module.exports = { fetchExcelAndSync };
