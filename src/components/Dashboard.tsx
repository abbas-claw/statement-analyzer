'use client';

import { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Transaction, StatementSummary, DEFAULT_CATEGORIES } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, TrendingUp, ShoppingBag } from 'lucide-react';

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

export function Dashboard({ transactions, summary, onRemoveFile }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const currencySymbol = summary.currency === 'PKR' ? 'Rs ' : '$';

  const categoryData = useMemo(() => {
    return Object.entries(summary.categoryBreakdown)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [summary.categoryBreakdown]);

  const monthlyData = useMemo(() => {
    return Object.entries(summary.monthlySpending)
      .map(([month, value]) => ({ 
        month: formatMonth(month), 
        spending: Math.round(value * 100) / 100 
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [summary.monthlySpending]);

  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return transactions;
    return transactions.filter(t => t.category === selectedCategory);
  }, [transactions, selectedCategory]);

  const uniqueFiles = [...new Set(transactions.map(t => t.sourceFile))];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Spent"
          amount={summary.totalSpent}
          icon={ArrowUpRight}
          color="text-red-600"
          bgColor="bg-red-50"
          currencySymbol={currencySymbol}
        />
        <SummaryCard
          title="Total Income"
          amount={summary.totalIncome}
          icon={ArrowDownRight}
          color="text-green-600"
          bgColor="bg-green-50"
          currencySymbol={currencySymbol}
        />
        <SummaryCard
          title="Transactions"
          amount={summary.transactionCount}
          icon={CreditCard}
          color="text-blue-600"
          bgColor="bg-blue-50"
          currencySymbol=""
        />
        <SummaryCard
          title="Net Flow"
          amount={summary.totalIncome - summary.totalSpent}
          icon={TrendingUp}
          color={(summary.totalIncome - summary.totalSpent) >= 0 ? 'text-green-600' : 'text-red-600'}
          bgColor={(summary.totalIncome - summary.totalSpent) >= 0 ? 'bg-green-50' : 'bg-red-50'}
          showSign
          currencySymbol={currencySymbol}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
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
                      setSelectedCategory(selectedCategory === categoryData[index].name ? null : categoryData[index].name);
                    }
                  }}
                >
                  {categoryData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={selectedCategory === categoryData[index]?.name ? '#000' : 'none'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value?: number) => [`${currencySymbol}${(value || 0).toFixed(2)}`, 'Amount']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filter (showing: {selectedCategory})
            </button>
          )}
        </div>

        {/* Monthly Spending */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Spending</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value?: number) => [`${currencySymbol}${(value || 0).toFixed(2)}`, 'Spending']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Merchants</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {summary.topMerchants.slice(0, 10).map((merchant, index) => (
            <div 
              key={index}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                const name = merchant.name.split(' ').slice(0, 3).join(' ');
                const matchingCategory = transactions.find(t => 
                  t.description.split(' ').slice(0, 3).join(' ') === name
                )?.category;
                setSelectedCategory(matchingCategory || null);
              }}
            >
              <p className="text-sm text-gray-600 truncate">{merchant.name}</p>
              <p className="text-lg font-semibold text-gray-800">
                {currencySymbol}{merchant.total.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

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
              <button
                onClick={() => onRemoveFile(file)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Transactions 
              {selectedCategory && <span className="text-blue-600"> ({selectedCategory})</span>}
            </h3>
            <span className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {transactions.length}
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
                {filteredTransactions.slice(0, 50).map((t) => (
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
                      <span className="inline-flex items-center gap-1">
                        {t.currency === 'PKR' ? 'Rs' : '$'}{Math.abs(t.amount).toFixed(2)}
                        {t.currency === 'PKR' && (
                          <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">PKR</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 50 && (
              <p className="text-center py-4 text-sm text-gray-500">
                Showing first 50 of {filteredTransactions.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ 
  title, 
  amount, 
  icon: Icon, 
  color, 
  bgColor,
  showSign = false,
  currencySymbol = '$'
}: { 
  title: string; 
  amount: number; 
  icon: any; 
  color: string; 
  bgColor: string;
  showSign?: boolean;
  currencySymbol?: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-6`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {showSign && amount > 0 ? '+' : ''}{currencySymbol}{amount.toFixed(2)}
      </p>
    </div>
  );
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
