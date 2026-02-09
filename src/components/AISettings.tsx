'use client';

import { useState, useEffect } from 'react';
import { Brain, Key, X, Check, Zap } from 'lucide-react';
import { getAIKey, setAIKey, getAIProvider, setAIProvider, type AIProvider } from '@/lib/ai';

interface AISettingsProps {
  onClose: () => void;
  onSave: () => void;
}

export function AISettings({ onClose, onSave }: AISettingsProps) {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getAIKey() || '');
    setProvider(getAIProvider());
  }, []);

  const handleSave = () => {
    setAIKey(key.trim() || null);
    setAIProvider(provider);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSave();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setKey('');
    setAIKey(null);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="brutal-card bg-white p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[var(--accent-purple)] flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">AI Features</h3>
              <p className="text-xs text-gray-500 font-medium">Smarter analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 border-2 border-[var(--border)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="brutal-card-flat p-3 mb-4 bg-[var(--accent-lime)]">
          <p className="text-xs font-bold">
            <Zap className="w-3.5 h-3.5 inline mr-1" />
            Enables: Smart categorization • Spending summary • Screenshot reading
          </p>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          API key stays in your browser. Calls go direct to the provider — no middleman.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2">Provider</label>
            <div className="flex gap-2">
              {(['openai', 'gemini'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex-1 px-3 py-3 text-sm font-bold uppercase tracking-wide border-3 transition-all ${
                    provider === p
                      ? 'bg-[var(--accent-purple)] text-white border-[var(--border)] shadow-[3px_3px_0px_var(--border)]'
                      : 'bg-white border-[var(--border)] hover:bg-gray-50'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI' : 'Gemini ✦ Free'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2">
              <Key className="w-3.5 h-3.5 inline mr-1" />
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full px-3 py-3 border-3 border-[var(--border)] text-sm font-mono focus:ring-0 focus:border-[var(--accent-purple)] outline-none bg-white"
            />
            <p className="text-xs text-gray-400 mt-1 font-medium">
              {provider === 'openai'
                ? '→ platform.openai.com/api-keys'
                : '→ aistudio.google.com/apikey (free tier available)'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {getAIKey() && (
            <button
              onClick={handleClear}
              className="brutal-btn px-4 py-2 text-xs bg-[var(--accent-red)] text-white"
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 border-2 border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="brutal-btn px-6 py-2 text-xs bg-[var(--accent-purple)] text-white disabled:opacity-50"
          >
            {saved ? <><Check className="w-4 h-4 inline mr-1" />Done</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
