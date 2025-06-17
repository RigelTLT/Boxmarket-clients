const axios = require("axios");
const CONFIG = require("../config");

async function sendLead(container, user) {
  await axios.post(CONFIG.BITRIX_WEBHOOK_URL, {
    TITLE: `Бронирование контейнера ${container.number}`,
    NAME: user.email,
    PHONE: [{ VALUE: user.phone, VALUE_TYPE: "WORK" }],
    COMMENTS: JSON.stringify(container.params),
  });
}

module.exports = { sendLead };
