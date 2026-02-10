export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  sourceFile: string;
  isRecurring?: boolean;
  recurringPeriod?: 'weekly' | 'monthly' | 'yearly';
}

export interface CurrencySummary {
  totalSpent: number;
  totalIncome: number;
  categoryBreakdown: Record<string, number>;
  monthlySpending: Record<string, number>;
  topMerchants: { name: string; total: number }[];
}

export interface StatementSummary {
  transactionCount: number;
  currencies: Record<string, CurrencySummary>;
  // Legacy fields for backward compat
  totalSpent: number;
  totalIncome: number;
  categoryBreakdown: Record<string, number>;
  monthlySpending: Record<string, number>;
  topMerchants: { name: string; total: number }[];
  currency: string;
}

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Health & Medical',
  'Travel',
  'Education',
  'Groceries',
  'Subscriptions & Software',
  'Gaming',
  'Transfer',
  'Income',
  'Other',
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'food', 'pizza', 'burger', 'kfc', 'mcdonald', 'starbucks', 'doordash', 'ubereats', 'grubhub', 'diner', 'eatery', 'kitchen', 'bakers', 'bakery', 'sweet', 'creme', 'seasons foods'],
  'Shopping': ['amazon', 'walmart', 'target', 'costco', 'ebay', 'shop', 'store', 'retail', 'mall', 'clothing', 'fashion', 'apparel', 'daraz', 'mart', 'citi mart', 'super mart'],
  'Transportation': ['uber', 'lyft', 'gas', 'fuel', 'shell', 'bp', 'chevron', 'exxon', 'parking', 'toll', 'metro', 'bus', 'train', 'transit', 'railway', 'aramco'],
  'Bills & Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'mobile', 'verizon', 'at&t', 'comcast', 'spectrum', 'utility', 'bill'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie', 'cinema', 'theater'],
  'Gaming': ['pubg', 'pubgmobile', 'game', 'playstation', 'xbox', 'steam', 'twitch', 'epic games'],
  'Subscriptions & Software': ['cursor', 'perplexity', 'canva', 'typefully', 'render.com', 'google cloud', 'google one', 'chatgpt', 'claude', 'moonshot', 'nanonoble', 'openai', 'anthropic'],
  'Health & Medical': ['pharmacy', 'doctor', 'hospital', 'clinic', 'medical', 'dental', 'health', 'cvs', 'walgreens', 'medicine'],
  'Travel': ['hotel', 'airbnb', 'flight', 'airline', 'delta', 'united', 'american airlines', 'southwest', 'marriott', 'hilton', 'booking', 'expedia'],
  'Education': ['school', 'university', 'college', 'tuition', 'course', 'udemy', 'coursera', 'book', 'library'],
  'Groceries': ['grocery', 'supermarket', 'whole foods', 'trader joe', 'kroger', 'safeway', 'aldi', 'walmart grocery'],
  'Transfer': ['transfer', 'venmo', 'zelle', 'paypal', 'cash app', 'wire', 'ach'],
  'Income': ['payroll', 'salary', 'direct deposit', 'refund', 'cashback', 'dividend', 'interest'],
};
