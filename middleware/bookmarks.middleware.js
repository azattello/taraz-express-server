const Track = require('../models/Track'); // Подключаем модель Track
const User = require('../models/User');   // Подключаем модель User

const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Количество записей на одной странице
    const skip = (page - 1) * limit;

    // Находим пользователя
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Общее количество закладок пользователя
    const totalBookmarks = user.bookmarks.length;

    // Берём закладки текущей страницы
    const bookmarksPage = user.bookmarks.slice(skip, skip + limit);

    // Обрабатываем закладки
    let updatedBookmarks = await Promise.all(
      bookmarksPage.map(async (bookmark) => {
        let track = null;

        if (bookmark.trackId) {
          track = await Track.findById(bookmark.trackId).populate(
            'history.status',
            'statusText'
          );
        } else {
          track = await Track.findOne({ track: bookmark.trackNumber }).populate(
            'history.status',
            'statusText'
          );

          if (track) {
            bookmark.trackId = track._id;
            await User.updateOne(
              { _id: userId, 'bookmarks.trackNumber': bookmark.trackNumber },
              { $set: { 'bookmarks.$.trackId': track._id } }
            );
          }
        }

        if (!track) {
          return {
            trackNumber: bookmark.trackNumber,
            createdAt: bookmark.createdAt,
            description: bookmark.description,
            readyForPickup: false,
          };
        }

        // Обновляем пользователя в треке, если он не совпадает
        if (!track.user || track.user !== user.phone) {
          track.user = user.phone;
          await track.save();
        }

        // Проверяем, есть ли статус "Готов к выдаче"
        const readyForPickup = track.history.some(
          (h) => h.status && h.status.statusText === 'Готов к выдаче'
        );

        return {
          ...bookmark,
          trackDetails: track,
          history: track.history,
          price: track.price,
          weight: track.weight,
          readyForPickup, // Флаг для кнопки
          createdAt: track.createdAt, // Добавляем дату создания
        };
      })
    );

    // Сортируем: сначала "Готов к выдаче", затем по дате (новые выше)
    updatedBookmarks.sort((a, b) => {
      if (a.readyForPickup !== b.readyForPickup) {
        return b.readyForPickup - a.readyForPickup;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalPages = Math.ceil(totalBookmarks / limit);

    res.status(200).json({
      updatedBookmarks,
      totalPages,
      totalBookmarks,
    });
  } catch (error) {
    console.error('Ошибка при получении закладок пользователя:', error);
    res.status(500).json({ message: 'Произошла ошибка при получении закладок' });
  }
};

module.exports = { getUserBookmarks };
