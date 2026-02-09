'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { Dashboard } from '@/components/Dashboard';
import { AISettings } from '@/components/AISettings';
import { Transaction } from '@/lib/types';
import { calculateSummary } from '@/lib/parser';
import { isAIEnabled, aiCategorize } from '@/lib/ai';
import { BarChart3, Upload, TrendingUp, DollarSign, Brain } from 'lucide-react';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Check AI status on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      setAiEnabled(isAIEnabled());
    }
  });

  const summary = useMemo(() => {
    return calculateSummary(transactions);
  }, [transactions]);

  const handleFilesParsed = useCallback(async (newTransactions: Transaction[]) => {
    let processed = newTransactions;

    // Run AI categorization if enabled
    if (isAIEnabled()) {
      try {
        processed = await aiCategorize(newTransactions);
      } catch {
        // Falls back to keyword categories
      }
    }

    setTransactions(prev => [...prev, ...processed]);
    setShowOnboarding(false);
  }, []);

  const handleRemoveFile = (fileName: string) => {
    const remainingTransactions = transactions.filter(t => t.sourceFile !== fileName);
    setTransactions(remainingTransactions);
    if (remainingTransactions.length === 0) {
      setShowOnboarding(true);
    }
  };

  const handleReset = () => {
    setTransactions([]);
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Statement Analyzer</h1>
                <p className="text-sm text-gray-500">Free, private, local processing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAISettings(true)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                  aiEnabled
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Brain className="w-4 h-4" />
                {aiEnabled ? 'AI On' : 'AI'}
              </button>
              {transactions.length > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {showOnboarding ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Understand Your Spending
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your bank and credit card statements. Get instant insights about where your money goes — completely free, no sign-up required.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={Upload}
                title="Multi-Format Support"
                description="Upload CSV or PDF files from any bank. Automatic format detection."
              />
              <FeatureCard
                icon={TrendingUp}
                title="Smart Categorization"
                description="Automatic categorization with keyword matching, or enable AI for even better accuracy."
              />
              <FeatureCard
                icon={DollarSign}
                title="Multi-Currency"
                description="Supports USD, PKR, and more. Each currency gets its own breakdown and charts."
              />
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Upload Your Statements
              </h3>
              <FileUploader onFilesParsed={handleFilesParsed} />
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>🔒 Privacy First:</strong> All processing happens in your browser.
                Your financial data never leaves your device.
                {aiEnabled && ' AI features call the API directly from your browser — no middleman.'}
              </p>
            </div>
          </div>
        ) : (
          <Dashboard
            transactions={transactions}
            summary={summary}
            onRemoveFile={handleRemoveFile}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-center text-sm text-gray-500">
            Statement Analyzer — 100% Free & Open Source
          </p>
        </div>
      </footer>

      {/* AI Settings Modal */}
      {showAISettings && (
        <AISettings
          onClose={() => setShowAISettings(false)}
          onSave={() => setAiEnabled(isAIEnabled())}
        />
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <Icon className="w-10 h-10 text-blue-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
