import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table
export class User extends Model {
  @Column({ type: DataType.BIGINT, unique: true })
  telegramId: number;

  @Column(DataType.STRING)
  username: string;

  @Column(DataType.STRING)
  firstName: string;

  @Column(DataType.STRING)
  lastName: string;

  @Column(DataType.STRING)
  phoneNumber: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  approved: boolean;
}
