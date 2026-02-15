import { Markup } from 'telegraf';

export const basicMenu = Markup.keyboard([
  ['📱 Telefon narxlari'],
  ['🛒 Buyurtma berish'],
  ['📣 Kanal'],
])
  .resize()
  .persistent();

export const orderMenu = Markup.keyboard([
  ['📱 Telefon narxlari'],
  ['🛒 Buyurtma berish'],
  ['🧺 Korzinka', '✅ Rasmiylashtirish'],
  ['📣 Kanal'],
])
  .resize()
  .persistent();

export const adminMenu = Markup.keyboard([
  ['📦 Buyurtmalar'],
  ['📊 Statistika'],
  ['👥 Foydalanuvchilar'],
  ['➕ Model qo‘shish', '📋 Modellar ro‘yxati'],
])
  .resize()
  .persistent();
