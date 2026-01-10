import { Markup } from 'telegraf';
import { PHONE_MODELS } from './models';

export const modelsKeyboard = Markup.keyboard(
  PHONE_MODELS.map((model) => [model]),
)
  .resize()
  .oneTime();
