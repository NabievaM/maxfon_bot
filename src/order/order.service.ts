import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Order } from './order.model';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order)
    private orderModel: typeof Order,
  ) {}

  create(data: {
    username: string;
    phoneNumber: string;
    items: string;
    total: number;
    first_name?: string;
    last_name?: string;
  }) {
    return this.orderModel.create(data);
  }

  findAll() {
    return this.orderModel.findAll({ raw: true });
  }
}
