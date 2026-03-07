import { Module } from '@nestjs/common';
import { PhoneModule } from '../phone/phone.module';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { BotUpdate } from './bot.update';

@Module({
  imports: [PhoneModule, OrderModule, UserModule],
  providers: [BotUpdate],
})
export class BotModule {}
