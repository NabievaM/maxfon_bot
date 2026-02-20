import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table
export class Order extends Model {
  @Column
  userId: number;

  @Column
  username: string;

  @Column
  phoneNumber: string;

  @Column(DataType.TEXT)
  items: string;

  @Column(DataType.FLOAT)
  total: number;

  @Column
  first_name: string;

  @Column
  last_name: string;
}
