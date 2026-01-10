import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN!,
    }),
    BotModule,
  ],
})
export class AppModule {}
