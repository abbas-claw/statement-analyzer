'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Transaction, StatementSummary, CurrencySummary } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, TrendingUp, Brain, Loader2, Sparkles } from 'lucide-react';
import { isAIEnabled, aiSummarize } from '@/lib/ai';

interface DashboardProps {
  transactions: Transaction[];
  summary: StatementSummary;
  onRemoveFile: (fileName: string) => void;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7'
];

function currencySymbol(c: string): string {
  if (c === 'PKR') return 'Rs ';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  return '$';
}

function fmt(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  if (currency === 'PKR') return `${sym}${Math.round(amount).toLocaleString()}`;
  return `${sym}${amount.toFixed(2)}`;
}

export function Dashboard({ transactions, summary, onRemoveFile }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const currencies = Object.keys(summary.currencies).sort();
  const hasMultipleCurrencies = currencies.length > 1;

  // Auto-generate AI summary when transactions change
  useEffect(() => {
    if (isAIEnabled() && transactions.length > 0) {
      generateAISummary();
    }
  }, [transactions.length]);

  const generateAISummary = async () => {
    setAiLoading(true);
    const result = await aiSummarize(transactions);
    setAiSummaryText(result);
    setAiLoading(false);
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return transactions;
    return transactions.filter(t => t.category === selectedCategory);
  }, [transactions, selectedCategory]);

  const uniqueFiles = [...new Set(transactions.map(t => t.sourceFile))];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Summary Cards — one row per currency */}
      {currencies.map(currency => {
        const cs = summary.currencies[currency];
        const sym = currencySymbol(currency);
        return (
          <div key={currency}>
            {hasMultipleCurrencies && (
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {currency} Transactions
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                title="Total Spent"
                value={fmt(cs.totalSpent, currency)}
                icon={ArrowUpRight}
                color="text-red-600"
                bgColor="bg-red-50"
              />
              <SummaryCard
                title="Total Income"
                value={fmt(cs.totalIncome, currency)}
                icon={ArrowDownRight}
                color="text-green-600"
                bgColor="bg-green-50"
              />
              <SummaryCard
                title="Transactions"
                value={String(transactions.filter(t => t.currency === currency).length)}
                icon={CreditCard}
                color="text-blue-600"
                bgColor="bg-blue-50"
              />
              <SummaryCard
                title="Net Flow"
                value={`${cs.totalIncome - cs.totalSpent >= 0 ? '+' : ''}${fmt(cs.totalIncome - cs.totalSpent, currency)}`}
                icon={TrendingUp}
                color={(cs.totalIncome - cs.totalSpent) >= 0 ? 'text-green-600' : 'text-red-600'}
                bgColor={(cs.totalIncome - cs.totalSpent) >= 0 ? 'bg-green-50' : 'bg-red-50'}
              />
            </div>
          </div>
        );
      })}

      {/* AI Summary */}
      {isAIEnabled() && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">AI Spending Analysis</h3>
            </div>
            {!aiLoading && (
              <button
                onClick={generateAISummary}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Brain className="w-4 h-4" /> Regenerate
              </button>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 text-purple-600 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing your spending patterns...</span>
            </div>
          ) : aiSummaryText ? (
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: markdownToHTML(aiSummaryText) }}
            />
          ) : null}
        </div>
      )}

      {/* Charts — one set per currency */}
      {currencies.map(currency => {
        const cs = summary.currencies[currency];
        const sym = currencySymbol(currency);

        const categoryData = Object.entries(cs.categoryBreakdown)
          .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
          .sort((a, b) => b.value - a.value);

        const monthlyData = Object.entries(cs.monthlySpending)
          .map(([month, value]) => ({
            month: formatMonth(month),
            spending: Math.round(value * 100) / 100,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return (
          <div key={`charts-${currency}`}>
            {hasMultipleCurrencies && (
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {currency} Breakdown
              </h3>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category Pie */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        onClick={(_, index) => {
                          if (categoryData[index]) {
                            setSelectedCategory(
                              selectedCategory === categoryData[index].name ? null : categoryData[index].name
                            );
                          }
                        }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke={selectedCategory === entry.name ? '#000' : 'none'}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), 'Amount']}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Bar */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Spending</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => currency === 'PKR' ? `${Math.round(v / 1000)}k` : `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), 'Spending']}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Merchants */}
            {cs.topMerchants.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Top Merchants {hasMultipleCurrencies && `(${currency})`}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {cs.topMerchants.slice(0, 10).map((merchant, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-gray-600 truncate">{merchant.name}</p>
                      <p className="text-lg font-semibold text-gray-800">{fmt(merchant.total, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Category filter indicator */}
      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtered by:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {selectedCategory}
          </span>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* File Sources */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Statement Sources</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueFiles.map((file, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              {file}
              <button onClick={() => onRemoveFile(file)} className="hover:text-blue-900">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Transactions</h3>
            <span className="text-sm text-gray-500">
              Showing {Math.min(filteredTransactions.length, 100)} of {filteredTransactions.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 100).map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{t.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-800 truncate max-w-xs">{t.description}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {t.category}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${
                      t.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {fmt(Math.abs(t.amount), t.currency)}
                      {hasMultipleCurrencies && (
                        <span className="ml-1 px-1 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          {t.currency}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 100 && (
              <p className="text-center py-4 text-sm text-gray-500">
                Showing first 100 of {filteredTransactions.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helper components ----

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-6`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// Simple markdown to HTML (bold, italic, headers, lists, line breaks)
function markdownToHTML(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-gray-800 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="list-disc mb-2">${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
