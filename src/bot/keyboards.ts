import { Markup } from 'telegraf';

export const basicMenu = Markup.keyboard([
  ['📱 Telefon narxlari'],
  ['🛒 Buyurtma berish'],
  ['📦 Mening buyurtmalarim'],
  ['📣 Kanal'],
])
  .resize()
  .persistent();

export const orderMenu = Markup.keyboard([
  ['📱 Telefon narxlari'],
  ['🛒 Buyurtma berish'],
  ['🧺 Korzinka', '✅ Rasmiylashtirish'],
  ['📦 Mening buyurtmalarim'],
  ['📣 Kanal'],
])
  .resize()
  .persistent();

export const adminMenu = Markup.keyboard([
  ['📥 So‘rovlar'],
  ['📦 Buyurtmalar'],
  ['📊 Statistika'],
  ['👥 Foydalanuvchilar'],
  ['➕ Model qo‘shish', '📋 Modellar ro‘yxati'],
])
  .resize()
  .persistent();
