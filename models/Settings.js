const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingsSchema = new Schema({
    videoLink: { type: String, default: '' },
    chinaAddress: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    aboutUsText: { type: String, default: '' },
    prohibitedItemsText: { type: String, default: '' },
    price: { type: String, default: '' },
    currency: { type: String, default: '' },
    globalReferralBonusPercentage: { type: Number, default: 4 },
    contractFilePath: { type: String, default: '' }, // Поле для хранения пути к файлу
    cargoResponsibility: { type: String, default: '' }, // Ответственность за груз
    deliveryTime: { type: String, default: '' }, // Срок доставки
});


module.exports = mongoose.model('Settings', SettingsSchema);
