const API = "http://localhost:3000/api";
let token = null;

document.getElementById("registerForm").onsubmit = async (e) => {
  e.preventDefault();
  const res = await axios.post(`${API}/auth/register`, {
    fullName: document.getElementById("regFullName").value,
    email: document.getElementById("regEmail").value,
    phone: document.getElementById("regPhone").value,
    password: document.getElementById("regPass").value,
  });
  alert("Зарегистрированы! Войдите.");
};

document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const res = await axios.post(`${API}/auth/login`, {
    email: document.getElementById("logEmail").value,
    password: document.getElementById("logPass").value,
  });
  token = res.data.token;
  localStorage.setItem("token", token);
  loadContainers();
};

async function loadContainers() {
  const res = await axios.get(`${API}/containers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = document.getElementById("containersList");
  list.innerHTML = "";
  res.data.forEach((c) => {
    const col = document.createElement("div");
    col.className = "col-md-4";
    col.innerHTML = `
      <div class="card mb-3">
        <img src="http://localhost:3000/${
          c.photos[0]
        }" class="card-img-top" alt="${c.number}">
        <div class="card-body">
          <h5 class="card-title">${c.number}</h5>
          <p class="card-text">Параметры: ${JSON.stringify(c.params)}</p>
          <button class="btn btn-primary" onclick="book('${
            c.number
          }')">Забронировать</button>
        </div>
      </div>`;
    list.append(col);
  });
  document.getElementById("authForms").classList.add("d-none");
  list.classList.remove("d-none");
}

function book(number) {
  window.location.href = `booking.html?number=${number}`;
}
