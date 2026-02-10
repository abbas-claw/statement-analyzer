import Papa from 'papaparse';
import { Transaction, CurrencySummary, CATEGORY_KEYWORDS, DEFAULT_CATEGORIES } from './types';

export function parseCSV(content: string, fileName: string): Transaction[] {
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: Transaction[] = [];

  results.data.forEach((row: any, index: number) => {
    const transaction = normalizeTransaction(row, fileName, index);
    if (transaction && isValidTransaction(transaction)) {
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

  // Find amount — check for separate debit/credit columns first
  const debitKey = keys.find(k => k.toLowerCase().includes('debit'));
  const creditKey = keys.find(k => k.toLowerCase().includes('credit'));

  if (debitKey && creditKey) {
    // Separate debit/credit columns
    const debitVal = parseFloat((row[debitKey] || '').toString().replace(/[$,]/g, ''));
    const creditVal = parseFloat((row[creditKey] || '').toString().replace(/[$,]/g, ''));
    if (!isNaN(debitVal) && debitVal > 0) {
      amount = -debitVal;
    } else if (!isNaN(creditVal) && creditVal > 0) {
      amount = creditVal;
    } else {
      amount = 0;
    }
  } else {
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
  }

  if (!date || amount === null || isNaN(amount)) {
    return null;
  }

  // Auto-categorize
  const category = categorizeTransaction(description);

  // Detect currency from the entire row content
  const rowContent = JSON.stringify(row).toLowerCase();
  const currency = detectCurrency(rowContent);

  return {
    id: `${fileName}-${index}-${Date.now()}`,
    date: formatDate(date),
    description: description.trim(),
    amount, // Preserve sign: negative = expense, positive = income
    currency,
    category,
    sourceFile: fileName,
  };
}

function detectCurrency(content: string): string {
  // Check for PKR indicators
  if (content.includes('pkr') || content.includes('rs.') || content.includes('rs ')) {
    return 'PKR';
  }
  return 'USD';
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
  // Try YYYY-MM-DD first (already correct format)
  let match = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  // MM/DD/YY
  match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (match) {
    const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
    return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  // Return as-is if no format matched
  return dateStr;
}

function buildCurrencySummary(txns: Transaction[]): CurrencySummary {
  const totalSpent = txns
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalIncome = txns
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const categoryBreakdown: Record<string, number> = {};
  txns.filter(t => t.amount < 0).forEach(t => {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
  });

  const monthlySpending: Record<string, number> = {};
  txns.filter(t => t.amount < 0).forEach(t => {
    const month = t.date.substring(0, 7);
    monthlySpending[month] = (monthlySpending[month] || 0) + Math.abs(t.amount);
  });

  const merchantTotals: Record<string, number> = {};
  txns.filter(t => t.amount < 0).forEach(t => {
    const name = t.description.split(' ').slice(0, 3).join(' ');
    merchantTotals[name] = (merchantTotals[name] || 0) + Math.abs(t.amount);
  });

  const topMerchants = Object.entries(merchantTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return { totalSpent, totalIncome, categoryBreakdown, monthlySpending, topMerchants };
}

// Keywords that indicate a failed, declined, or pending transaction
const FAILED_KEYWORDS = [
  'failed', 'declined', 'pending', 'reversed', 'declined', 'failed',
  'insufficient', 'over limit', 'auth failed', 'transaction failed',
  'payment failed', 'purchase failed', 'cancelled', 'voided',
  'rejected', 'not completed', 'did not complete', 'attempt failed'
];

export function isValidTransaction(txn: Transaction): boolean {
  const lowerDesc = txn.description.toLowerCase();

  // Skip failed/declined/pending transactions
  if (FAILED_KEYWORDS.some(keyword => lowerDesc.includes(keyword))) {
    return false;
  }

  // Skip positive amounts (income, refunds, upcoming balance)
  // We only want actual spending (negative amounts)
  if (txn.amount > 0) {
    return false;
  }

  return true;
}

export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Map<string, Transaction>();

  for (const t of transactions) {
    // Create a unique key based on normalized date, description, and amount
    const key = `${t.date}|${t.description.toLowerCase().trim()}|${t.amount}`;
    if (!seen.has(key)) {
      seen.set(key, t);
    }
  }

  return Array.from(seen.values());
}

export function calculateSummary(transactions: Transaction[]) {
  // Group by currency
  const byCurrency: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    if (!byCurrency[t.currency]) byCurrency[t.currency] = [];
    byCurrency[t.currency].push(t);
  });

  const currencies: Record<string, CurrencySummary> = {};
  for (const [currency, txns] of Object.entries(byCurrency)) {
    currencies[currency] = buildCurrencySummary(txns);
  }

  // Primary currency for legacy fields
  const primaryCurrency = Object.entries(byCurrency)
    .sort((a, b) => b[1].length - a[1].length)[0]?.[0] || 'USD';
  const primary = currencies[primaryCurrency] || buildCurrencySummary([]);

  return {
    transactionCount: transactions.length,
    currencies,
    // Legacy
    totalSpent: primary.totalSpent,
    totalIncome: primary.totalIncome,
    categoryBreakdown: primary.categoryBreakdown,
    monthlySpending: primary.monthlySpending,
    topMerchants: primary.topMerchants,
    currency: primaryCurrency,
  };
}
