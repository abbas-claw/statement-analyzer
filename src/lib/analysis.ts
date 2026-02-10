import { Transaction } from './types';
import { differenceInDays, parseISO } from 'date-fns';

export interface RecurringGroup {
  description: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  transactions: Transaction[];
  nextDate?: string;
}

export interface HeatmapData {
  date: string;
  count: number;
  total: number;
  intensity: number; // 0-4
}

export function detectRecurringTransactions(transactions: Transaction[]): Transaction[] {
  // Sort by date
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recurring: Transaction[] = [];
  
  // Group by description (normalized) and amount
  const groups: Record<string, Transaction[]> = {};
  
  sorted.forEach(t => {
    // Simplify description to catch "Netflix" vs "Netflix.com" vs "Netflix *123"
    // Extract first 2 words or specific known recurring patterns
    const key = `${t.description.toLowerCase().substring(0, 15)}_${Math.abs(t.amount).toFixed(0)}_${t.currency}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  // Analyze groups
  Object.values(groups).forEach(group => {
    if (group.length < 2) return;

    // Check intervals
    let isRecurring = false;
    let period: 'weekly' | 'monthly' | 'yearly' | undefined;

    // Calculate average days between transactions
    const intervals: number[] = [];
    for (let i = 1; i < group.length; i++) {
      const diff = differenceInDays(parseISO(group[i].date), parseISO(group[i-1].date));
      intervals.push(diff);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    if (avgInterval >= 25 && avgInterval <= 35) {
      isRecurring = true;
      period = 'monthly';
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      isRecurring = true;
      period = 'weekly';
    } else if (avgInterval >= 360 && avgInterval <= 370) {
      isRecurring = true;
      period = 'yearly';
    }

    if (isRecurring) {
      group.forEach(t => {
        t.isRecurring = true;
        t.recurringPeriod = period;
        recurring.push(t);
      });
    }
  });

  return sorted;
}

export function generateHeatmapData(transactions: Transaction[]): HeatmapData[] {
  const daily: Record<string, { count: number; total: number }> = {};

  transactions.forEach(t => {
    if (t.amount >= 0) return; // Only expenses
    const date = t.date;
    if (!daily[date]) daily[date] = { count: 0, total: 0 };
    daily[date].count++;
    daily[date].total += Math.abs(t.amount);
  });

  // Calculate intensity (0-4) based on total spent
  const maxTotal = Math.max(...Object.values(daily).map(d => d.total));
  
  return Object.entries(daily).map(([date, data]) => {
    let intensity = 0;
    if (data.total > 0) {
      const ratio = data.total / maxTotal;
      if (ratio > 0.8) intensity = 4;
      else if (ratio > 0.6) intensity = 3;
      else if (ratio > 0.4) intensity = 2;
      else intensity = 1;
    }

    return {
      date,
      count: data.count,
      total: data.total,
      intensity
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getAccountLabels(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map(t => t.sourceFile))).sort();
}
