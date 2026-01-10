import { Markup } from 'telegraf';

export const mainMenu = Markup.keyboard([
  ['📱 Telefon narxlari'],
  ['🛒 Buyurtma berish'],
  ['📣 Kanal'],
])
  .resize()
  .persistent();
