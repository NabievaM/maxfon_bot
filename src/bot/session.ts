export interface OrderSession {
  cart: Record<string, number>;
  messages: Record<string, number>;
  waitingForQuantity?: string;
}
