const Container = require("../models/Container");

exports.listContainers = async (req, res) => {
  const {
    search = "",
    types = "",
    cities = "",
    page = 1,
    limit = 12,
  } = req.query;
  const filter = {};

  // Поиск по номеру, типу или терминалу
  if (search)
    filter.$or = [
      { number: new RegExp(search, "i") },
      { "params.Тип": new RegExp(search, "i") },
      { "params.Город": new RegExp(search, "i") },
    ];

  // Фильтрация по типу контейнера
  if (types) filter["params.Тип"] = { $in: types.split(",") };
  // Фильтрация по локации (терминалу)
  if (cities) filter["params.Город"] = { $in: cities.split(",") };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Container.countDocuments(filter);
  const items = await Container.find(filter).skip(skip).limit(Number(limit));

  res.json({ items, totalPages: Math.ceil(total / limit) });
};
