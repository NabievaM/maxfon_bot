import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table
export class Phone extends Model {
  @Column
  name: string;

  @Column(DataType.FLOAT)
  price: number;

  @Column
  image: string;
}
