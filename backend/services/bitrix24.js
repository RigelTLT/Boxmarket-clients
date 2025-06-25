const axios = require("axios");
const webhookUrl = process.env.BITRIX_WEBHOOK_URL;

exports.sendLeadToBitrix = async (data) => {
  try {
    await axios.post(webhookUrl, {
      fields: {
        TITLE: `Заявка от BoxMarket`,
        NAME: data.name,
        EMAIL: [{ VALUE: data.email, VALUE_TYPE: "WORK" }],
        PHONE: [{ VALUE: data.phone, VALUE_TYPE: "WORK" }],
        COMMENTS: `Контейнер: ${data.containerName}, Тип: ${data.type}, Сток: ${data.stok}, Клиент: ${data.client}, Город: ${data.containerCity}`,
        SOURCE_ID: `14`,
      },
    });
  } catch (err) {
    console.error(
      "Ошибка при отправке в Bitrix:",
      err.response?.data || err.message
    );
  }
};
