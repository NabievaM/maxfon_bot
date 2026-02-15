import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Phone } from './phone.model';
import { PhoneService } from './phone.service';

@Module({
  imports: [SequelizeModule.forFeature([Phone])],
  providers: [PhoneService],
  exports: [PhoneService],
})
export class PhoneModule {}
