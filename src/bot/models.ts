import path from 'path';

const MR100 = path.resolve(__dirname, '../../uploads/MR100.jpg');
const MR001 = path.resolve(__dirname, '../../uploads/MR001.jpg');
const MR475 = path.resolve(__dirname, '../../uploads/MR475.jpg');
const B100 = path.resolve(__dirname, '../../uploads/B100.jpg');
const S700 = path.resolve(__dirname, '../../uploads/S700.jpg');
const S25classic = path.resolve(__dirname, '../../uploads/S25classic.jpg');
const flip5 = path.resolve(__dirname, '../../uploads/flip5.jpg');

export const PHONE_MODELS = [
  {
    name: 'MR100',
    price: 7.7,
    image: MR100,
  },
  {
    name: 'MR001',
    price: 11,
    image: MR001,
  },
  {
    name: 'MR475',
    price: 13,
    image: MR475,
  },
  {
    name: 'B100',
    price: 14.5,
    image: B100,
  },
  {
    name: 'S700',
    price: 20,
    image: S700,
  },
  {
    name: 'S25 classic',
    price: 19,
    image: S25classic,
  },
  { name: 'FLIP 5', price: 17, image: flip5 },
];
