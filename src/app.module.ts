import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { SequelizeModule } from '@nestjs/sequelize';

import { BotModule } from './bot/bot.module';
import { PhoneModule } from './phone/phone.module';
import { OrderModule } from './order/order.module';
import { UserModule } from './user/user.module';
import { Phone } from './phone/phone.model';
import { Order } from './order/order.model';
import { User } from './user/user.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      models: [Phone, Order, User],
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadModels: true,
      synchronize: true,
      logging: false,
    }),

    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN!,
    }),

    BotModule,
    PhoneModule,
    OrderModule,
    UserModule,
  ],
})
export class AppModule {}
