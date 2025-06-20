const { Booking } = require("../models/Booking");
const { sendLeadToBitrix } = require("../services/bitrix24");

exports.createBooking = async (req, res, next) => {
  try {
    const { userId, containerId } = req.body;
    // 1) Сохранить бронирование в БД
    const booking = await Booking.create({ userId, containerId });

    // 2) Достать данные пользователя и контейнера для отправки в Битрикс
    const user = await booking.getUser(); // assuming association
    const container = await booking.getContainer();

    // 3) Отправить лид в Bitrix24
    await sendLeadToBitrix({
      name: user.name,
      email: user.email,
      containerName: container.name,
      containerCity: container.city,
    });

    res.status(201).json({ message: "Заявка принята" });
  } catch (err) {
    next(err);
  }
};
