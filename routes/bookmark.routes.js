const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Track = require('../models/Track');
const { getUserBookmarks } = require('../middleware/bookmarks.middleware');
const { getUserArchive } = require('../middleware/archive.middleware');

// Маршрут для получения закладок по userId
router.get('/bookmarks/:userId', getUserBookmarks);

// Маршрут для получения архива по userId
router.get('/archives/:userId', getUserArchive);

// Роут для прикрепления трек-номера к аккаунту пользователя
router.post('/:userId/bookmarks', async (req, res) => {
    const { userId } = req.params;
    const { description, trackNumber } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверяем, не существует ли уже закладка с таким трек-номером
        if (user.bookmarks.some(b => b.trackNumber.toLowerCase() === trackNumber.toLowerCase())) {
            return res.status(400).json({ message: 'Закладка с таким трек-номером уже существует' });
        }

        const newBookmark = { description, trackNumber };
        user.bookmarks.push(newBookmark);
        await user.save();

        return res.status(201).json({ message: 'Трек-номер успешно прикреплен к пользователю', bookmark: newBookmark });
    } catch (error) {
        console.error('Ошибка при прикреплении трек-номера к пользователю:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при прикреплении трек-номера к пользователю' });
    }
});


router.post('/confirm-receipt', async (req, res) => {
    const { phone, trackNumber } = req.body; // Получаем phone и trackNumber из тела запроса

    try {
        // Находим пользователя по номеру телефона и номеру трека в закладках
        const user = await User.findOne({ phone});

        if (!user) {
            return res.status(404).json({ message: 'User not found or track is not bookmarked' });
        }

        // Находим закладку по trackNumber
        const trackBookmark = user.bookmarks.find(bookmark => bookmark.trackNumber === trackNumber);

        // Находим трек по trackId
        const track = await Track.findById(trackBookmark.trackId).populate('history.status');

        // Добавляем историю трека в архив
        const archiveData = {
            description: trackBookmark.description,
            trackNumber: trackBookmark.trackNumber,
            history: track.history.map(entry => ({
                status: entry.status,
                date: entry.date
            })),
            receivedAt: new Date() // Сохраняем дату получения в архиве
        };

        // Добавляем информацию о получении в архив
        user.archive.push(archiveData);

        // Удаляем закладку
        user.bookmarks = user.bookmarks.filter(bookmark => bookmark.trackNumber !== trackNumber);

        // Сохраняем изменения
        await user.save();

        res.status(200).json({ message: 'Track received and archived successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});




// Роут для получения закладок клиента
router.get('/:userId/getBookmarks', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const bookmarks = user.bookmarks;
        let notFoundBookmarks = [];
        let updatedBookmarks = [];

        await Promise.all(bookmarks.map(async (bookmark) => {
            const formattedTrackNumber = bookmark.trackNumber.replace(/\s+/g, '').toLowerCase();
            const track = await Track.findOne({ track: { $regex: new RegExp(formattedTrackNumber, 'i') } });

            if (!track) {
                notFoundBookmarks.push({
                    trackNumber: bookmark.trackNumber,
                    currentStatus: null,
                    createdAt: bookmark.createdAt,
                    description: bookmark.description
                });
            } else {
                bookmark.trackId = track._id;
                bookmark.currentStatus = track.status;

                updatedBookmarks.push({
                    trackNumber: bookmark.trackNumber,
                    currentStatus: track.status,
                    description: bookmark.description,
                    history: track.history
                });
            }
        }));

        // Сохраняем пользователя с обновленными данными закладок
        await user.save();

        return res.status(200).json({ notFoundBookmarks, updatedBookmarks });
    } catch (error) {
        console.error('Ошибка при получении закладок пользователя:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при получении закладок пользователя' });
    }
});

// Роут для удаления закладки
router.delete('/:userId/delete/:trackNumber', async (req, res) => {
    const { userId, trackNumber } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const index = user.bookmarks.findIndex(b => b.trackNumber.toLowerCase() === trackNumber.toLowerCase());
        if (index === -1) {
            return res.status(404).json({ message: 'Закладка не найдена' });
        }

        user.bookmarks.splice(index, 1);
        await user.save();

        return res.status(200).json({ message: 'Закладка успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении закладки:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при удалении закладки' });
    }
});


module.exports = router;