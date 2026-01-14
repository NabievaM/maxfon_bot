import { Markup } from 'telegraf';

export const contactKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📞 Telefon raqamni ulashish')],
]).resize();
