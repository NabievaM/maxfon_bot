import { Markup } from 'telegraf';

export function modelKeyboard(model: string, count: number) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➖', `minus_${model}`),
      Markup.button.callback(`${count}`, 'noop'),
      Markup.button.callback('➕', `plus_${model}`),
    ],
  ]);
}
