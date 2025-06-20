// Base API prefix
const API = "/api";
let token = localStorage.getItem("token") || null;
let modalInstance;
let currentPage = 1;
// Load persisted page size or default
let pageSize = parseInt(localStorage.getItem("pageSize"), 10) || 12;
let totalPages = 1;
const maxPageButtons = 4;
$(document).ready(() => {
  if (!token) {
    $("#authWrapper").show();
    $("body > :not(#authWrapper)").css("visibility", "hidden");
  } else {
    $("#authWrapper").hide();
    $("body > :not(#authWrapper)").css("visibility", "visible");
  }

  let isLogin = true;

  $("#toggleAuth").on("click", () => {
    isLogin = !isLogin;
    $("#authTitle").text(isLogin ? "Вход" : "Регистрация");
    $("#authActionBtn").text(isLogin ? "Войти" : "Зарегистрироваться");
    $("#toggleAuth").text(
      isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"
    );
    $("#authFullName, #authPhone").toggleClass("d-none", isLogin);
  });

  $("#authActionBtn").on("click", async () => {
    const email = $("#authEmail").val();
    const password = $("#authPassword").val();
    const data = { email, password };

    if (!isLogin) {
      data.fullName = $("#authFullName").val();
      data.phone = $("#authPhone").val();
    }

    try {
      const url = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const res = await axios.post(url, data);
      localStorage.setItem("token", res.data.token);
      location.reload();
    } catch (err) {
      alert("Ошибка авторизации/регистрации");
    }
  });
});
$(document).ready(() => {
  // Инициализация селектов через Select2
  $("#typeFilter, #cityFilter").select2({
    placeholder: "Выберите значение(я)",
  });
  $("#pageSizeSelect").val(pageSize);
  // Сброс и выход
  $("#resetFiltersBtn").on("click", () => {
    $("#typeFilter, #cityFilter").val(null).trigger("change");
    $("#searchInput").val("");
    currentPage = 1;
    loadContainers();
  });
  $("#logoutBtn").on("click", () => {
    localStorage.removeItem("token");
    window.location.reload();
  });
  $("#typeFilter, #cityFilter").on("change", () => {
    currentPage = 1; // сбрасываем на первую страницу
    loadContainers(); // заново грузим данные с учётом новых фильтров
  });
  $("#searchInput").on("input", () => {
    currentPage = 1;
    loadContainers();
  });
  // Изменение размера страницы: сохранить и перезагрузить
  $("#pageSizeSelect").on("change", function () {
    pageSize = parseInt($(this).val(), 10);
    localStorage.setItem("pageSize", pageSize);
    currentPage = 1;
    loadContainers();
  });
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Элементы управления пагинацией
  $("#pageSizeSelect").on("change", function () {
    pageSize = parseInt($(this).val(), 10);
    currentPage = 1;
    loadContainers();
  });
  // 1) Вешаем обработчик на кнопки “Забронировать”
  $(document).on("click", ".reserve-btn", function () {
    const containerId = $(this).data("container-id");
    const containerName = $(this).data("container-name");
    const containerCity = $(this).data("container-city");

    // Предположим, что у вас есть глобальный объект currentUser
    // с полями name и email, полученный при логине
    $("#modalUserName").text(currentUser.name);
    $("#modalUserEmail").text(currentUser.email);
    $("#modalContainerName").text(containerName);
    $("#modalContainerCity").text(containerCity);

    // Сохраняем в дата-атрибуте ID контейнера
    $("#confirmBookingBtn").data("container-id", containerId);

    // Открываем модал
    const bookingModal = new bootstrap.Modal(
      document.getElementById("bookingModal")
    );
    bookingModal.show();
  });

  // 2) При клике “Подтвердить” — отправляем запрос
  $("#confirmBookingBtn").on("click", async function () {
    const containerId = $(this).data("container-id");
    try {
      await axios.post("/api/bookings", {
        containerId,
        userId: currentUser.id,
      });
      // Закрываем модал
      bootstrap.Modal.getInstance(
        document.getElementById("bookingModal")
      ).hide();

      // Успешное сообщение
      alert("Заявка принята, с вами скоро свяжутся");
      // Можно — обновить список или перенаправить
      loadContainers();
    } catch (err) {
      console.error(err);
      alert("Не удалось отправить заявку. Попробуйте снова.");
    }
  });
  // Загрузка фильтров и контейнеров
  loadFilters();
  loadContainers();
});

async function loadFilters() {
  try {
    const res = await axios.get(`${API}/containers`, {
      params: { limit: 10000 },
    });
    const items = res.data.items;
    const types = [...new Set(items.map((c) => c.params.Тип))].filter(Boolean);
    const cities = [...new Set(items.map((c) => c.params.Город))].filter(
      Boolean
    );

    $("#typeFilter")
      .empty()
      .select2({
        data: types.map((t) => ({ id: t, text: t })),
        placeholder: "Выберите тип(ы)",
      });
    $("#cityFilter")
      .empty()
      .select2({
        data: cities.map((c) => ({ id: c, text: c })),
        placeholder: "Выберите город(а)",
      });
  } catch (err) {
    console.error("Ошибка загрузки фильтров", err);
  }
}

async function loadContainers() {
  try {
    const selectedTypes = $("#typeFilter").val() || [];
    const selectedCities = $("#cityFilter").val() || [];
    const params = {
      types: selectedTypes.join(","),
      cities: selectedCities.join(","),
      search: $("#searchInput").val().trim(),
      page: currentPage,
      limit: pageSize,
    };
    const res = await axios.get(`${API}/containers`, { params });
    renderContainers(res.data.items);
    // Принять totalPages из ответа, если возвращается
    totalPages = res.data.totalPages || Math.ceil(res.data.total / pageSize);
    renderPagination();
  } catch (err) {
    console.error("Ошибка загрузки контейнеров", err);
  }
}

function renderContainers(items) {
  const $list = $("#containersList").empty();
  items.forEach((c) => {
    const carouselId = `carousel${c._id}`;
    const $card = $(
      `<div class="col-md-4 col-lg-3 mb-4">
        <div class="card h-100" data-id="${c._id}">
          <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">
              ${c.photos
                .map((url, idx) => {
                  const src = url.startsWith("http") ? url : `/cache/${url}`;
                  return `<div class="carousel-item ${
                    idx === 0 ? "active" : ""
                  }">
                          <img src="${src}" class="d-block w-100" alt="Контейнер">
                        </div>`;
                })
                .join("")}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
              <span class="carousel-control-prev-icon"></span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
              <span class="carousel-control-next-icon"></span>
            </button>
          </div>
          <div class="card-body">
            <h5 class="card-title">${c.params.Тип} - ${c.number}</h5>
            <p class="card-text">Город: ${c.params.Город}</p>
            </div>
             <div class="card-footer">
            <button
        class="reserve-btn btn btn-sm btn-success w-100 book-btn mt-2"
        data-container-id="{{this.id}}"
        data-container-name="{{this.name}}"
        data-container-city="{{this.city}}">
        Забронировать
      </button>
        </div>
      </div>`
    );

    $card.find(".card-body").on("click", (e) => {
      if ($(e.target).hasClass("book-btn")) return;
      openModal(c);
    });
    $card.find(".book-btn").on("click", (e) => {
      e.stopPropagation();
      bookContainer(c._id);
    });

    $list.append($card);
  });
}

function renderPagination() {
  const $pagination = $("#pagination").empty();
  // First page
  $pagination.append(
    `<li class="page-item ${
      currentPage === 1 ? "disabled" : ""
    }"><a class="page-link" href="#" data-page="1">««</a></li>`
  );
  // Previous page
  $pagination.append(
    `<li class="page-item ${
      currentPage === 1 ? "disabled" : ""
    }"><a class="page-link" href="#" data-page="${currentPage - 1}">«</a></li>`
  );
  // Page numbers window
  let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let end = start + maxPageButtons - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxPageButtons + 1);
  }
  for (let p = start; p <= end; p++) {
    $pagination.append(
      `<li class="page-item ${
        p === currentPage ? "active" : ""
      }"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`
    );
  }
  // Next page
  $pagination.append(
    `<li class="page-item ${
      currentPage === totalPages ? "disabled" : ""
    }"><a class="page-link" href="#" data-page="${currentPage + 1}">»</a></li>`
  );
  // Last page
  $pagination.append(
    `<li class="page-item ${
      currentPage === totalPages ? "disabled" : ""
    }"><a class="page-link" href="#" data-page="${totalPages}">»»</a></li>`
  );
  // Handlers
  $pagination.find("a.page-link").on("click", function (e) {
    e.preventDefault();
    const p = parseInt($(this).data("page"), 10);
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      loadContainers();
    }
  });
}

function foramatedTime(serialNumber) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const dateInMs = serialNumber * millisecondsPerDay;
  const date = new Date(excelEpoch.getTime() + dateInMs);
  const pad = (num) => String(num).padStart(2, "0");
  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function openModal(c) {
  $("#containerModal").data("container-id", c._id);
  $("#modalTitle").text(`${c.params.Тип} — ${c.number}`);
  const $inner = $("#modalCarouselInner").empty();
  c.photos.forEach((url, idx) => {
    const src = url.startsWith("http") ? url : `/cache/${url}`;
    $inner.append(
      `<div class="carousel-item ${idx === 0 ? "active" : ""}">
         <img src="${src}" class="d-block w-100" alt="Контейнер">
       </div>`
    );
  });

  // Build params grid
  const keys = [
    "Габариты",
    "Тоннаж",
    "Состояние",
    "Терминал",
    "Сток",
    "Адрес",
    "Дата прибытия",
    "Дата убытия",
    "Хранение дней",
    "ЗПУ",
    "Согласован ремонт",
    "Комментарий",
    "Забронировал",
    "Дата брони",
    "Комментарий бронирования",
  ];
  let gridHtml = '<div class="row">';
  keys.forEach((key) => {
    const val = c.params[key] || "";
    gridHtml += `
      <div class="col-md-6 mb-2">
        <strong>${key}:</strong> ${
      key === "Дата прибытия" && val ? foramatedTime(val) : val
    }
      </div>`;
  });
  gridHtml += "</div>";
  console.log(c.params["Дата брони"]);
  $("#modalInfo").html(gridHtml);
  modalInstance = new bootstrap.Modal(
    document.getElementById("containerModal")
  );
  modalInstance.show();
}

async function bookContainer(id) {
  try {
    await axios.post(`${API}/booking`, { containerId: id });
    alert("Заявка отправлена!");
    modalInstance.hide();
  } catch (err) {
    console.error("Ошибка бронирования", err);
    alert("Ошибка при бронировании");
  }
}
