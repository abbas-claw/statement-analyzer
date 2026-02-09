'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { Dashboard } from '@/components/Dashboard';
import { AISettings } from '@/components/AISettings';
import { Transaction } from '@/lib/types';
import { calculateSummary } from '@/lib/parser';
import { isAIEnabled, aiCategorize } from '@/lib/ai';
import { BarChart3, Upload, TrendingUp, DollarSign, Brain, Camera, Zap } from 'lucide-react';

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
    setTransactions(prev => [...prev, ...processed]);
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
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="bg-[var(--fg)] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--accent-blue)] flex items-center justify-center">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold uppercase tracking-wide">Statement Analyzer</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">Free • Private • Local</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAISettings(true)}
                className={`brutal-btn px-2 sm:px-3 py-2 text-[10px] sm:text-xs flex items-center gap-1 ${
                  aiEnabled
                    ? 'bg-[var(--accent-purple)] text-white'
                    : 'bg-white text-[var(--fg)]'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{aiEnabled ? 'AI On' : 'AI Off'}</span>
              </button>
              {transactions.length > 0 && (
                <button
                  onClick={handleReset}
                  className="brutal-btn px-2 sm:px-3 py-2 text-[10px] sm:text-xs bg-[var(--accent-red)] text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {showOnboarding ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Hero */}
            <div className="text-center py-8 sm:py-12">
              <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight leading-tight">
                Know Where<br />
                <span className="text-[var(--accent-blue)]">Your Money Goes</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mt-4 max-w-xl mx-auto font-medium">
                Upload statements or screenshots. Get instant insights. No sign-up. No BS.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FeatureCard
                icon={Upload}
                title="CSV + PDF + Images"
                description="Any format. AI reads screenshots too."
                color="var(--accent-blue)"
              />
              <FeatureCard
                icon={Zap}
                title="Smart Categories"
                description="Auto-categorize with keywords or AI."
                color="var(--accent-yellow)"
              />
              <FeatureCard
                icon={DollarSign}
                title="Multi-Currency"
                description="USD + PKR side by side. No mixing."
                color="var(--accent-green)"
              />
            </div>

            {/* Upload */}
            <div className="brutal-card p-6 sm:p-8 bg-white">
              <h3 className="text-lg font-bold uppercase tracking-wide text-center mb-6">
                Upload Statements
              </h3>
              <FileUploader onFilesParsed={handleFilesParsed} />
            </div>

            {/* Privacy */}
            <div className="brutal-card-flat p-4 bg-[var(--accent-lime)]">
              <p className="text-sm font-bold">
                🔒 Everything runs in your browser. Data never leaves your device.
                {aiEnabled && ' AI calls go direct to the provider — no middleman.'}
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
      <footer className="border-t-3 border-[var(--border)] mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400">
            Statement Analyzer — Free & Open Source
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

function FeatureCard({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) {
  return (
    <div className="brutal-card p-5 sm:p-6 bg-white">
      <div className="w-12 h-12 flex items-center justify-center mb-4" style={{ backgroundColor: color }}>
        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-sm text-gray-600 font-medium">{description}</p>
    </div>
  );
}
