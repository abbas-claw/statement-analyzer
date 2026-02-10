'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Transaction, StatementSummary, CurrencySummary } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp, Brain, Loader2, Sparkles, Upload, ChevronDown } from 'lucide-react';
import { isAIEnabled, aiSummarize } from '@/lib/ai';
import { FileUploader } from './FileUploader';

interface DashboardProps {
  transactions: Transaction[];
  summary: StatementSummary;
  onRemoveFile: (fileName: string) => void;
  onAddTransactions?: (transactions: Transaction[]) => void;
}

const COLORS = [
  '#00e5ff', '#34d399', '#f0b429', '#ff6b6b', '#a78bfa',
  '#58a6ff', '#f472b6', '#84cc16', '#fb923c', '#818cf8',
  '#2dd4bf', '#c084fc',
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
      {currencies.map((currency, ci) => {
        const cs = summary.currencies[currency];
        return (
          <div key={currency}>
            {multi && (
              <div className="inline-block px-3 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--accent-teal)] text-xs mono-data tracking-widest mb-3 animate-entry stagger-1">
                {currency}
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <StatCard
                label="Total Spent"
                value={fmt(cs.totalSpent, currency)}
                icon={<ArrowUpRight className="w-4 h-4" />}
                accent="var(--accent-red)"
                delay={0}
              />
              <StatCard
                label="Transactions"
                value={String(transactions.filter(t => t.currency === currency).length)}
                icon={<CreditCard className="w-4 h-4" />}
                accent="var(--accent-teal)"
                delay={1}
              />
              <StatCard
                label="Avg / Transaction"
                value={(() => {
                  const count = transactions.filter(t => t.currency === currency).length;
                  return count > 0 ? fmt(cs.totalSpent / count, currency) : fmt(0, currency);
                })()}
                icon={<TrendingUp className="w-4 h-4" />}
                accent="var(--accent-amber)"
                delay={2}
              />
            </div>
          </div>
        );
      })}

      {/* AI Summary */}
      {isAIEnabled() && (
        <div className="glass-card p-5 sm:p-6 animate-entry stagger-5" style={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(88, 166, 255, 0.08))',
          borderColor: 'rgba(167, 139, 250, 0.2)',
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-purple)]" />
              <h3 className="text-sm font-semibold text-[var(--accent-purple)]">AI Analysis</h3>
            </div>
            {!aiLoading && (
              <button onClick={generateAISummary} className="btn-ghost px-3 py-1.5 text-[10px] !border-[var(--accent-purple)]/30 !text-[var(--accent-purple)]">
                <Brain className="w-3 h-3 inline mr-1" /> Regenerate
              </button>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-purple)]" />
              <span className="text-xs text-[var(--text-secondary)]">Analyzing spending patterns...</span>
            </div>
          ) : aiSummaryText ? (
            <div
              className="max-w-none text-sm leading-relaxed text-[var(--text-secondary)] [&_strong]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)] [&_h4]:text-[var(--text-primary)]"
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
              <div className="inline-block px-3 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--accent-amber)] text-xs mono-data tracking-widest mb-3">
                {currency} Breakdown
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Category Pie */}
              <div className="glass-card p-4 sm:p-6 animate-entry stagger-6">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">By Category</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(_, index) => {
                          if (categoryData[index]) {
                            setSelectedCategory(
                              selectedCategory === categoryData[index].name ? null : categoryData[index].name
                            );
                          }
                        }}
                        stroke="transparent"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={selectedCategory === entry.name ? 1 : 0.8}
                            style={{
                              filter: selectedCategory === entry.name ? `drop-shadow(0 0 8px ${COLORS[index % COLORS.length]}60)` : 'none',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), '']}
                        contentStyle={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Bar */}
              <div className="glass-card p-4 sm:p-6 animate-entry stagger-7">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Monthly Spending</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => currency === 'PKR' ? `${Math.round(v / 1000)}k` : `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value?: number) => [fmt(value || 0, currency), '']}
                        contentStyle={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Bar
                        dataKey="spending"
                        fill="var(--accent-teal)"
                        radius={[4, 4, 0, 0]}
                        opacity={0.85}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Merchants */}
            {cs.topMerchants.length > 0 && (
              <div className="glass-card p-4 sm:p-6 mt-4 sm:mt-6 animate-entry stagger-8">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
                  Top Merchants {multi && <span className="tag ml-2">{currency}</span>}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {cs.topMerchants.slice(0, 10).map((m, i) => (
                    <div
                      key={i}
                      className="glass-card-flat p-3 hover:border-[var(--border-accent)] transition-all cursor-default group"
                    >
                      <p className="text-[10px] mono-data text-[var(--text-muted)] truncate group-hover:text-[var(--text-secondary)] transition-colors">
                        {m.name}
                      </p>
                      <p className="text-base sm:text-lg font-semibold mono-data mt-1 text-[var(--text-primary)]">
                        {fmt(m.total, currency)}
                      </p>
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
        <div className="flex items-center gap-2 flex-wrap animate-fade">
          <span className="text-[10px] mono-data text-[var(--text-muted)]">FILTER:</span>
          <span className="tag !bg-[var(--accent-teal)]/10 !text-[var(--accent-teal)] !border-[var(--accent-teal)]/20">
            {selectedCategory}
          </span>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] mono-data text-[var(--accent-teal)] hover:underline cursor-pointer"
          >
            clear
          </button>
        </div>
      )}

      {/* File Sources + Add More */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Sources</h3>
          {onAddTransactions && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="btn-primary text-[10px] sm:text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Add More
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueFiles.map((file, i) => (
            <span key={i} className="tag flex items-center gap-2 !bg-[var(--accent-amber)]/10 !text-[var(--accent-amber)] !border-[var(--accent-amber)]/20">
              <span className="truncate max-w-[200px]">{file}</span>
              <button onClick={() => onRemoveFile(file)} className="hover:text-[var(--accent-red)] transition-colors">&times;</button>
            </span>
          ))}
        </div>
        {showUpload && onAddTransactions && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <FileUploader onFilesParsed={(txns) => { onAddTransactions(txns); setShowUpload(false); }} />
          </div>
        )}
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Transactions</h3>
            <span className="text-[10px] mono-data text-[var(--text-muted)]">
              {Math.min(filteredTransactions.length, 100)} of {filteredTransactions.length}
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-3 px-3 text-[10px] mono-data text-[var(--text-muted)] tracking-wider">DATE</th>
                  <th className="text-left py-3 px-3 text-[10px] mono-data text-[var(--text-muted)] tracking-wider">DESCRIPTION</th>
                  <th className="text-left py-3 px-3 text-[10px] mono-data text-[var(--text-muted)] tracking-wider">CATEGORY</th>
                  <th className="text-right py-3 px-3 text-[10px] mono-data text-[var(--text-muted)] tracking-wider">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 100).map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border-subtle)] row-hover transition-colors">
                    <td className="py-3 px-3 text-xs mono-data text-[var(--text-secondary)]">{t.date}</td>
                    <td className="py-3 px-3 text-xs text-[var(--text-primary)] truncate max-w-xs">{t.description}</td>
                    <td className="py-3 px-3">
                      <span className="tag">{t.category}</span>
                    </td>
                    <td className={`py-3 px-3 text-xs mono-data font-semibold text-right ${
                      t.amount >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                    }`}>
                      {fmt(Math.abs(t.amount), t.currency)}
                      {multi && <span className="tag ml-1.5 text-[9px]">{t.currency}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-2">
            {filteredTransactions.slice(0, 100).map((t) => (
              <div key={t.id} className="glass-card-flat p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] mono-data text-[var(--text-muted)]">{t.date}</span>
                  <span className={`text-sm mono-data font-semibold ${
                    t.amount >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                  }`}>
                    {fmt(Math.abs(t.amount), t.currency)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-primary)] truncate">{t.description}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="tag text-[9px]">{t.category}</span>
                  {multi && <span className="tag text-[9px]">{t.currency}</span>}
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length > 100 && (
            <p className="text-center py-4 text-[10px] mono-data text-[var(--text-muted)]">
              Showing 100 of {filteredTransactions.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

function StatCard({ label, value, icon, accent, delay }: {
  label: string; value: string; icon: React.ReactNode; accent: string; delay: number;
}) {
  return (
    <div
      className={`glass-card p-4 sm:p-5 animate-entry stagger-${delay + 1}`}
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-[10px] mono-data text-[var(--text-muted)] tracking-wider">{label.toUpperCase()}</span>
      </div>
      <p className="text-lg sm:text-2xl font-semibold mono-data" style={{ color: accent }}>{value}</p>
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
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold mt-3 mb-1 text-xs">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold mt-4 mb-2 text-sm">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="list-disc mb-2">${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
