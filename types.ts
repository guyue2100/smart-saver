export type TransactionType = 'INCOME' | 'EXPENSE' | 'INTEREST' | 'BONUS' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // ISO String
  balanceSnapshot: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl?: string; // Optional image for the goal
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  unlocked: boolean;
  condition: (state: AppState) => boolean;
  unlockedDate?: string;
}

export interface TieredInterestConfig {
  lowThreshold: number;   // Default 400
  highThreshold: number;  // Default 1500
  lowRate: number;        // Rate for amount <= lowThreshold (Default 0.20)
  midRate: number;        // Rate for lowThreshold < amount <= highThreshold (Default 0.10)
  highRate: number;       // Rate for amount > highThreshold (Default 0.05)
}

export interface AppState {
  appName: string; // Configurable App Title
  adminPassword?: string; // Configurable Admin Password (default '8090')
  walletBalance: number; // Liquid cash
  totalAssets: number; // Wallet + Savings
  weekCount: number;
  consecutiveWeeksNoSpend: number;
  hasSpentThisWeek: boolean;
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  spendingLimit: number; // 0 means no limit
  badges: string[]; // List of unlocked badge IDs
  lastSettlementDate?: string; // Tracks the date string (e.g., "Sun Oct 01 2023") of the last auto-settlement
  
  // Settings
  weeklyAllowance: number; // Default 10
  interestRateMode: 'TIERED' | 'FIXED';
  fixedInterestRate: number; // e.g. 0.10 for 10%
  tieredInterestConfig: TieredInterestConfig; // Custom tiered rules
}

export const INITIAL_STATE: AppState = {
  appName: '彦仔宝库',
  adminPassword: '8090',
  walletBalance: 0,
  totalAssets: 0,
  weekCount: 0,
  consecutiveWeeksNoSpend: 0,
  hasSpentThisWeek: false,
  savingsGoals: [],
  transactions: [],
  spendingLimit: 0,
  badges: [],
  lastSettlementDate: '',
  weeklyAllowance: 10,
  interestRateMode: 'TIERED',
  fixedInterestRate: 0.1,
  tieredInterestConfig: {
    lowThreshold: 400,
    highThreshold: 1500,
    lowRate: 0.20,
    midRate: 0.10,
    highRate: 0.05
  }
};