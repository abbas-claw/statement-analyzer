import Papa from 'papaparse';
import { Transaction, CATEGORY_KEYWORDS, DEFAULT_CATEGORIES } from './types';

export function parseCSV(content: string, fileName: string): Transaction[] {
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: Transaction[] = [];

  results.data.forEach((row: any, index: number) => {
    const transaction = normalizeTransaction(row, fileName, index);
    if (transaction) {
      transactions.push(transaction);
    }
  });

  return transactions;
}

function normalizeTransaction(row: any, fileName: string, index: number): Transaction | null {
  // Try to find date, description, and amount columns
  const keys = Object.keys(row);
  const lowerKeys = keys.map(k => k.toLowerCase());

  let date = '';
  let description = '';
  let amount: number | null = null;

  // Find date
  const dateKey = keys.find(k => 
    k.toLowerCase().includes('date') || 
    k.toLowerCase().includes('posted') ||
    lowerKeys.find(lk => lk.includes('date') || lk.includes('posted'))
  ) || keys[0];
  date = row[dateKey] || '';

  // Find description
  const descKey = keys.find(k => 
    k.toLowerCase().includes('description') || 
    k.toLowerCase().includes('merchant') ||
    k.toLowerCase().includes('payee') ||
    k.toLowerCase().includes('transaction')
  ) || keys[1];
  description = row[descKey] || '';

  // Find amount
  const amountKey = keys.find(k => {
    const lower = k.toLowerCase();
    return lower.includes('amount') || lower.includes('debit') || lower.includes('credit') || lower.includes('value');
  });
  
  if (amountKey) {
    const rawAmount = row[amountKey];
    if (typeof rawAmount === 'string') {
      amount = parseFloat(rawAmount.replace(/[$,]/g, ''));
    } else if (typeof rawAmount === 'number') {
      amount = rawAmount;
    }
  }

  if (!date || amount === null || isNaN(amount)) {
    return null;
  }

  // Auto-categorize
  const category = categorizeTransaction(description);

  return {
    id: `${fileName}-${index}-${Date.now()}`,
    date: formatDate(date),
    description: description.trim(),
    amount: -Math.abs(amount), // Convert to expense (negative)
    category,
    sourceFile: fileName,
  };
}

export function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}

function formatDate(dateStr: string): string {
  // Try various date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let [, month, day, year] = match;
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Return as-is if no format matched
  return dateStr;
}

export function calculateSummary(transactions: Transaction[]) {
  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  transactions
    .filter(t => t.amount < 0)
    .forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
    });

  // Monthly spending
  const monthlySpending: Record<string, number> = {};
  transactions
    .filter(t => t.amount < 0)
    .forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlySpending[month] = (monthlySpending[month] || 0) + Math.abs(t.amount);
    });

  // Top merchants
  const merchantTotals: Record<string, number> = {};
  transactions
    .filter(t => t.amount < 0)
    .forEach(t => {
      const name = t.description.split(' ').slice(0, 3).join(' '); // First 3 words
      merchantTotals[name] = (merchantTotals[name] || 0) + Math.abs(t.amount);
    });

  const topMerchants = Object.entries(merchantTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalSpent,
    totalIncome,
    transactionCount: transactions.length,
    categoryBreakdown,
    monthlySpending,
    topMerchants,
  };
}
