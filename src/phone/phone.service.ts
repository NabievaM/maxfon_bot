import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Phone } from './phone.model';

@Injectable()
export class PhoneService {
  constructor(
    @InjectModel(Phone)
    private phoneModel: typeof Phone,
  ) {}

  create(data: { name: string; price: number; image: string }) {
    return this.phoneModel.create(data);
  }

  findAll() {
    return this.phoneModel.findAll({ raw: true });
  }

  findOne(id: number) {
    return this.phoneModel.findByPk(id, { raw: true });
  }

  update(id: number, data: Partial<Phone>) {
    return this.phoneModel.update(data, { where: { id } });
  }

  delete(id: number) {
    return this.phoneModel.destroy({ where: { id } });
  }
}
