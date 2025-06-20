const Booking = require("../models/Booking");
const User = require("../models/User");
const Container = require("../models/Container");
const { sendLeadToBitrix } = require("../services/bitrix24");

exports.createBooking = async (req, res, next) => {
  try {
    const { userId, containerId } = req.body;
    if (!userId || !containerId) {
      return res
        .status(400)
        .json({ error: "userId и containerId обязательны" });
    }
    // создаём запись правильно по полям схемы
    const booking = await Booking.create({
      user: userId,
      container: containerId,
    });

    // получаем полные объекты для отправки в Bitrix24
    const user = await User.findById(userId);
    const container = await Container.findById(containerId);
    if (!user || !container) {
      return res
        .status(404)
        .json({ error: "Пользователь или контейнер не найдены" });
    }

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
