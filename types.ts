
export enum AssetType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  FUND = 'FUND',
  CASH = 'CASH',
  REAL_ESTATE = 'REAL_ESTATE',
  LIABILITY = 'LIABILITY',
  OTHER = 'OTHER'
}

export enum Currency {
  USD = 'USD',
  CNY = 'CNY',
  HKD = 'HKD'
}

export type Language = 'en' | 'zh';
export type AIProvider = 'gemini' | 'deepseek';

export enum EntryMode {
  SIMPLE = 'SIMPLE',
  TRANSACTION = 'TRANSACTION'
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND'
}

export interface Transaction {
  id: string;
  assetId: string;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
  fee: number;
  total: number;
}

export interface Asset {
  id: string;
  symbol: string; // e.g., AAPL, BTC, or "Apt 4B"
  name: string;
  type: AssetType;
  quantity: number;
  avgCost: number; // Weighted average cost
  currentPrice: number; // Mocked live price OR Manual Valuation
  currency: Currency;
  lastUpdated?: number; // Timestamp of last price update
  // Computed fields for UI convenience
  currentValue?: number;
  totalCost?: number;
  pnl?: number;
  pnlPercent?: number;
}

export interface PortfolioSummary {
  totalBalance: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number; // Mocked for demo
  dayPnLPercent: number;
}