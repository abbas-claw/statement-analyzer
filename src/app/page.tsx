'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { Dashboard } from '@/components/Dashboard';
import { AISettings } from '@/components/AISettings';
import { Transaction } from '@/lib/types';
import { calculateSummary, deduplicateTransactions } from '@/lib/parser';
import { isAIEnabled, aiCategorize } from '@/lib/ai';
import { BarChart3, Upload, Zap, DollarSign, Brain, Shield } from 'lucide-react';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  useState(() => {
    if (typeof window !== 'undefined') setAiEnabled(isAIEnabled());
  });

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  const handleFilesParsed = useCallback(async (newTransactions: Transaction[]) => {
    let processed = newTransactions;
    if (isAIEnabled()) {
      try { processed = await aiCategorize(newTransactions); } catch {}
    }
    setTransactions(prev => {
      const combined = [...prev, ...processed];
      return deduplicateTransactions(combined);
    });
    setShowOnboarding(false);
  }, []);

  const handleRemoveFile = (fileName: string) => {
    const remaining = transactions.filter(t => t.sourceFile !== fileName);
    setTransactions(remaining);
    if (remaining.length === 0) setShowOnboarding(true);
  };

  const handleReset = () => {
    setTransactions([]);
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen grid-bg relative">
      {/* Atmosphere orbs */}
      <div className="orb-teal" />
      <div className="orb-amber" />

      {/* Header */}
      <header className="relative z-10 border-b border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-entry stagger-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-teal-dim)] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--bg-deep)]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-semibold tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
                  Statement Analyzer
                </h1>
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mono-data">
                  free &bull; private &bull; local
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 animate-entry stagger-2">
              <button
                onClick={() => setShowAISettings(true)}
                className={`btn-ghost px-3 py-2 text-[10px] sm:text-xs flex items-center gap-1.5 ${
                  aiEnabled ? '!border-[var(--accent-purple)] !text-[var(--accent-purple)]' : ''
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{aiEnabled ? 'AI Active' : 'Enable AI'}</span>
              </button>
              {transactions.length > 0 && (
                <button onClick={handleReset} className="btn-ghost px-3 py-2 text-[10px] sm:text-xs !text-[var(--accent-red)] !border-[var(--accent-red)]/30">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {showOnboarding ? (
          <div className="space-y-8 sm:space-y-12">
            {/* Hero */}
            <div className="text-center py-8 sm:py-16 animate-entry stagger-1">
              <h2 className="display-text text-4xl sm:text-6xl lg:text-7xl tracking-tight">
                Know where your
                <br />
                <span className="display-italic" style={{ color: 'var(--accent-teal)' }}>
                  money goes
                </span>
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-5 max-w-md mx-auto leading-relaxed">
                Upload statements or screenshots. Get instant insights.
                No sign-up. No servers. Everything runs in your browser.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-entry stagger-3">
              <FeatureCard
                icon={Upload}
                title="Any Format"
                description="CSV, PDF, or screenshots — AI reads them all."
                accent="var(--accent-teal)"
                delay="stagger-3"
              />
              <FeatureCard
                icon={Zap}
                title="Smart Categories"
                description="Auto-categorize with keywords or AI."
                accent="var(--accent-amber)"
                delay="stagger-4"
              />
              <FeatureCard
                icon={DollarSign}
                title="Multi-Currency"
                description="USD and PKR tracked separately."
                accent="var(--accent-green)"
                delay="stagger-5"
              />
            </div>

            {/* Upload */}
            <div className="glass-card p-6 sm:p-10 animate-entry stagger-6">
              <h3 className="display-text text-xl sm:text-2xl text-center mb-6" style={{ color: 'var(--text-primary)' }}>
                Drop your statements
              </h3>
              <FileUploader onFilesParsed={handleFilesParsed} />
            </div>

            {/* Privacy */}
            <div className="animate-entry stagger-7 flex items-center justify-center gap-2 py-4">
              <Shield className="w-4 h-4 text-[var(--accent-green)]" />
              <p className="text-xs text-[var(--text-muted)] mono-data">
                100% client-side. Your data never leaves this device.
                {aiEnabled && ' AI calls go direct to the provider.'}
              </p>
            </div>
          </div>
        ) : (
          <Dashboard
            transactions={transactions}
            summary={summary}
            onRemoveFile={handleRemoveFile}
            onAddTransactions={handleFilesParsed}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-subtle)] mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <p className="text-center text-[10px] mono-data text-[var(--text-muted)] tracking-widest">
            STATEMENT ANALYZER — FREE &amp; OPEN SOURCE
          </p>
        </div>
      </footer>

      {showAISettings && (
        <AISettings
          onClose={() => setShowAISettings(false)}
          onSave={() => setAiEnabled(isAIEnabled())}
        />
      )}
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, description, accent, delay
}: {
  icon: any; title: string; description: string; accent: string; delay: string;
}) {
  return (
    <div className={`glass-card p-5 sm:p-6 animate-entry ${delay}`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={2} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}
