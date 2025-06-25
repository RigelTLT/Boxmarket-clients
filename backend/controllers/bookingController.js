const Booking = require("../models/Booking");
const User = require("../models/User");
const Container = require("../models/Container");
const { sendLeadToBitrix } = require("../services/bitrix24");

exports.createBooking = async (req, res, next) => {
  try {
    const { containerId } = req.body;
    const userId = req.user?.id;

    if (!userId || !containerId) {
      return res.status(400).json({
        error: "containerId обязателен, пользователь должен быть авторизован",
      });
    }

    const existing = await Booking.findOne({
      user: userId,
      container: containerId,
    });
    if (existing) {
      return res.status(409).json({ error: "Заявка уже отправлена ранее" });
    }

    const booking = await Booking.create({
      user: userId,
      container: containerId,
    });

    const user = await User.findById(userId);
    const container = await Container.findById(containerId);
    if (!user || !container) {
      return res
        .status(404)
        .json({ error: "Пользователь или контейнер не найдены" });
    }

    await sendLeadToBitrix({
      name: user.fullName || user.name,
      email: user.email,
      phone: user.phone,
      containerName: container.params?.Номер,
      containerCity: container.params?.Город || "Не указан",
      stok: container.params?.Сток,
      client: container.params?.Клиент,
      type: container.params?.Тип,
    });

    res.status(201).json({ message: "Заявка принята" });
  } catch (err) {
    next(err);
  }
};
