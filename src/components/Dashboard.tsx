'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Transaction, StatementSummary, CurrencySummary } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp, Brain, Loader2, Sparkles, Upload } from 'lucide-react';
import { isAIEnabled, aiSummarize } from '@/lib/ai';
import { FileUploader } from './FileUploader';

interface DashboardProps {
  transactions: Transaction[];
  summary: StatementSummary;
  onRemoveFile: (fileName: string) => void;
  onAddTransactions?: (transactions: Transaction[]) => void;
}

const COLORS = [
  '#2563EB', '#10B981', '#FFD600', '#EF4444', '#7C3AED',
  '#FF2D8A', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7'
];

function sym(c: string): string {
  if (c === 'PKR') return 'Rs ';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  return '$';
}

function fmt(amount: number, currency: string): string {
  const s = sym(currency);
  if (currency === 'PKR') return `${s}${Math.round(amount).toLocaleString()}`;
  return `${s}${amount.toFixed(2)}`;
}

export function Dashboard({ transactions, summary, onRemoveFile, onAddTransactions }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const currencies = Object.keys(summary.currencies).sort();
  const multi = currencies.length > 1;

  useEffect(() => {
    if (isAIEnabled() && transactions.length > 0 && !aiSummaryText) {
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
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Summary Cards per currency */}
      {currencies.map(currency => {
        const cs = summary.currencies[currency];
        return (
          <div key={currency}>
            {multi && (
              <div className="inline-block px-3 py-1 bg-[var(--fg)] text-white text-xs font-bold uppercase tracking-widest mb-3">
                {currency}
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Spent"
                value={fmt(cs.totalSpent, currency)}
                icon={<ArrowUpRight className="w-5 h-5" />}
                accent="var(--accent-red)"
              />
              <StatCard
                label="Income"
                value={fmt(cs.totalIncome, currency)}
                icon={<ArrowDownRight className="w-5 h-5" />}
                accent="var(--accent-green)"
              />
              <StatCard
                label="Count"
                value={String(transactions.filter(t => t.currency === currency).length)}
                icon={<CreditCard className="w-5 h-5" />}
                accent="var(--accent-blue)"
              />
              <StatCard
                label="Net"
                value={`${cs.totalIncome - cs.totalSpent >= 0 ? '+' : ''}${fmt(cs.totalIncome - cs.totalSpent, currency)}`}
                icon={<TrendingUp className="w-5 h-5" />}
                accent={cs.totalIncome - cs.totalSpent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
              />
            </div>
          </div>
        );
      })}

      {/* AI Summary */}
      {isAIEnabled() && (
        <div className="brutal-card p-5 sm:p-6 bg-[var(--accent-purple)] text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wide text-sm sm:text-base">AI Analysis</h3>
            </div>
            {!aiLoading && (
              <button
                onClick={generateAISummary}
                className="text-xs font-bold uppercase px-3 py-1 bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-1"
              >
                <Brain className="w-3.5 h-3.5" /> Redo
              </button>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Analyzing patterns...</span>
            </div>
          ) : aiSummaryText ? (
            <div
              className="max-w-none text-sm leading-relaxed [&_*]:text-white/90 [&_strong]:text-white [&_h3]:text-white [&_h4]:text-white"
              style={{ color: 'rgba(255,255,255,0.9)' }}
              dangerouslySetInnerHTML={{ __html: mdToHTML(aiSummaryText) }}
            />
          ) : null}
        </div>
      )}

      {/* Charts per currency */}
      {currencies.map(currency => {
        const cs = summary.currencies[currency];

        const categoryData = Object.entries(cs.categoryBreakdown)
          .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
          .sort((a, b) => b.value - a.value);

        const monthlyData = Object.entries(cs.monthlySpending)
          .map(([month, value]) => ({
            month: fmtMonth(month),
            spending: Math.round(value * 100) / 100,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return (
          <div key={`charts-${currency}`}>
            {multi && (
              <div className="inline-block px-3 py-1 bg-[var(--fg)] text-white text-xs font-bold uppercase tracking-widest mb-3">
                {currency} Breakdown
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Category Pie */}
              <div className="brutal-card p-4 sm:p-6 bg-white">
                <h3 className="font-bold uppercase tracking-wide text-sm mb-4">By Category</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
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
                            stroke={selectedCategory === entry.name ? '#000' : '#fff'}
                            strokeWidth={selectedCategory === entry.name ? 3 : 1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), '']}
                        contentStyle={{ border: '2px solid #1A1A1A', borderRadius: 0, fontWeight: 600, fontSize: '0.85rem' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.75rem', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Bar */}
              <div className="brutal-card p-4 sm:p-6 bg-white">
                <h3 className="font-bold uppercase tracking-wide text-sm mb-4">Monthly</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis
                        tick={{ fontSize: 11, fontWeight: 600 }}
                        tickFormatter={(v) => currency === 'PKR' ? `${Math.round(v / 1000)}k` : `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), '']}
                        contentStyle={{ border: '2px solid #1A1A1A', borderRadius: 0, fontWeight: 600, fontSize: '0.85rem' }}
                      />
                      <Bar dataKey="spending" fill="#2563EB" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Merchants */}
            {cs.topMerchants.length > 0 && (
              <div className="brutal-card p-4 sm:p-6 bg-white mt-4 sm:mt-6">
                <h3 className="font-bold uppercase tracking-wide text-sm mb-4">
                  Top Merchants {multi && `(${currency})`}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {cs.topMerchants.slice(0, 10).map((m, i) => (
                    <div key={i} className="brutal-card-flat p-3 bg-gray-50 hover:bg-[var(--accent-lime)] transition-colors cursor-pointer">
                      <p className="text-xs font-bold text-gray-500 uppercase truncate">{m.name}</p>
                      <p className="text-base sm:text-lg font-bold mt-1">{fmt(m.total, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Filter indicator */}
      {selectedCategory && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase">Filter:</span>
          <span className="brutal-tag bg-[var(--accent-blue)] text-white">{selectedCategory}</span>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-xs font-bold uppercase text-[var(--accent-blue)] underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* File Sources + Add More */}
      <div className="brutal-card p-4 sm:p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold uppercase tracking-wide text-sm">Sources</h3>
          {onAddTransactions && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="brutal-btn px-3 py-1.5 text-xs bg-[var(--accent-blue)] text-white flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Add More
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueFiles.map((file, i) => (
            <span key={i} className="brutal-tag bg-[var(--accent-yellow)] flex items-center gap-2 px-3 py-1">
              <span className="truncate max-w-[200px]">{file}</span>
              <button onClick={() => onRemoveFile(file)} className="hover:text-[var(--accent-red)] font-bold">×</button>
            </span>
          ))}
        </div>
        {showUpload && onAddTransactions && (
          <div className="mt-4 pt-4 border-t-3 border-[var(--border)]">
            <FileUploader onFilesParsed={(txns) => { onAddTransactions(txns); setShowUpload(false); }} />
          </div>
        )}
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 && (
        <div className="brutal-card p-4 sm:p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase tracking-wide text-sm">Transactions</h3>
            <span className="text-xs font-bold text-gray-400">
              {Math.min(filteredTransactions.length, 100)} of {filteredTransactions.length}
            </span>
          </div>

          {/* Mobile: card layout / Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-3 border-[var(--border)]">
                  <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">Category</th>
                  <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 100).map((t) => (
                  <tr key={t.id} className="border-b-2 border-gray-200 hover:bg-[var(--accent-lime)] transition-colors">
                    <td className="py-3 px-3 text-sm font-mono font-medium">{t.date}</td>
                    <td className="py-3 px-3 text-sm font-medium truncate max-w-xs">{t.description}</td>
                    <td className="py-3 px-3">
                      <span className="brutal-tag bg-gray-100">{t.category}</span>
                    </td>
                    <td className={`py-3 px-3 text-sm font-mono font-bold text-right ${
                      t.amount >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                    }`}>
                      {fmt(Math.abs(t.amount), t.currency)}
                      {multi && (
                        <span className="ml-1 brutal-tag text-[10px] bg-gray-100">{t.currency}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-2">
            {filteredTransactions.slice(0, 100).map((t) => (
              <div key={t.id} className="brutal-card-flat p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono font-bold text-gray-500">{t.date}</span>
                  <span className={`text-sm font-mono font-bold ${
                    t.amount >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                  }`}>
                    {fmt(Math.abs(t.amount), t.currency)}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{t.description}</p>
                <div className="flex gap-2 mt-1">
                  <span className="brutal-tag text-[10px] bg-gray-200">{t.category}</span>
                  {multi && <span className="brutal-tag text-[10px] bg-gray-200">{t.currency}</span>}
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length > 100 && (
            <p className="text-center py-4 text-xs font-bold text-gray-400 uppercase">
              Showing 100 of {filteredTransactions.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="brutal-card p-4 sm:p-5 bg-white" style={{ borderLeftWidth: '6px', borderLeftColor: accent }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold font-mono" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function fmtMonth(s: string): string {
  const [y, m] = s.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function mdToHTML(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h4 class="font-bold mt-3 mb-1 uppercase text-xs tracking-wide">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold mt-4 mb-2 uppercase text-sm tracking-wide">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="list-disc mb-2">${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
