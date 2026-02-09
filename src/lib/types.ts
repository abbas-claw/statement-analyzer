export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  sourceFile: string;
}

export interface StatementSummary {
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  categoryBreakdown: Record<string, number>;
  monthlySpending: Record<string, number>;
  topMerchants: { name: string; total: number }[];
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
  'Transfer',
  'Income',
  'Other',
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'food', 'pizza', 'burger', 'kfc', 'mcdonald', 'starbucks', 'doordash', 'ubereats', 'grubhub', 'diner', 'eatery', 'kitchen'],
  'Shopping': ['amazon', 'walmart', 'target', 'costco', 'ebay', 'shop', 'store', 'retail', 'mall', 'clothing', 'fashion', 'apparel'],
  'Transportation': ['uber', 'lyft', 'gas', 'fuel', 'shell', 'bp', 'chevron', 'exxon', 'parking', 'toll', 'metro', 'bus', 'train', 'transit'],
  'Bills & Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'mobile', 'verizon', 'at&t', 'comcast', 'spectrum', 'utility', 'bill'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie', 'cinema', 'theater', 'game', 'playstation', 'xbox', 'steam', 'twitch'],
  'Health & Medical': ['pharmacy', 'doctor', 'hospital', 'clinic', 'medical', 'dental', 'health', 'cvs', 'walgreens', 'medicine'],
  'Travel': ['hotel', 'airbnb', 'flight', 'airline', 'delta', 'united', 'american airlines', 'southwest', 'marriott', 'hilton', 'booking', 'expedia'],
  'Education': ['school', 'university', 'college', 'tuition', 'course', 'udemy', 'coursera', 'book', 'library'],
  'Groceries': ['grocery', 'supermarket', 'whole foods', 'trader joe', 'kroger', 'safeway', 'aldi', 'walmart grocery'],
  'Transfer': ['transfer', 'venmo', 'zelle', 'paypal', 'cash app', 'wire', 'ach'],
  'Income': ['payroll', 'salary', 'direct deposit', 'refund', 'cashback', 'dividend', 'interest'],
};
