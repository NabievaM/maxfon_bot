export interface OrderSession {
  step?: 'MODEL' | 'COUNT' | 'PHONE';
  model?: string;
  count?: number;
  phone?: string;
}
