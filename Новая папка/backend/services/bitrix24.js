const axios = require("axios");
const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;

async function sendLeadToBitrix({ name, email, containerName, containerCity }) {
  const fields = {
    TITLE: `Бронирование контейнера: ${containerName}`,
    NAME: name,
    EMAIL: [{ VALUE: email, VALUE_TYPE: "WORK" }],
    COMMENTS: `Город: ${containerCity}`,
  };
  await axios.post(webhookUrl, { fields });
}

module.exports = { sendLeadToBitrix };
