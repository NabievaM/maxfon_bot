import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './user.model';

@Injectable()
export class UserService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findByTelegramId(telegramId: number) {
    const user = await this.userModel.findOne({ where: { telegramId } });
    return user ? user.toJSON() : null;
  }

  async createIfNotExists(data: any) {
    const existing = await this.findByTelegramId(data.telegramId);
    if (existing) return existing;

    const user = await this.userModel.create({ ...data, approved: false });
    return user.toJSON();
  }

  async findAll() {
    const users = await this.userModel.findAll();
    return users.map((u) => u.toJSON());
  }

  async getPendingUsers() {
    const users = await this.userModel.findAll({
      where: { approved: false },
      attributes: ['id', 'telegramId', 'firstName', 'lastName', 'username'],
    });

    return users.map((u) => u.toJSON());
  }

  async approveUser(id: number) {
    await this.userModel.update({ approved: true }, { where: { id } });
  }

  async rejectUser(id: number) {
    await this.userModel.destroy({ where: { id } });
  }

  async findById(id: number) {
    const user = await this.userModel.findByPk(id);
    return user ? user.toJSON() : null;
  }
}
