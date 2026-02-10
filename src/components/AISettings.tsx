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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade">
      <div className="glass-card p-6 max-w-md w-full" style={{
        background: 'linear-gradient(145deg, var(--bg-card), var(--bg-surface))',
        borderColor: 'var(--border-default)',
      }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/25 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[var(--accent-purple)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">AI Features</h3>
              <p className="text-[10px] mono-data text-[var(--text-muted)]">smarter analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-lg p-3 mb-4 bg-[var(--accent-teal)]/8 border border-[var(--accent-teal)]/15">
          <p className="text-[11px] text-[var(--accent-teal)]">
            <Zap className="w-3 h-3 inline mr-1" />
            Enables: Smart categorization, spending summary, screenshot reading
          </p>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
          API key stays in your browser. Calls go direct to the provider — no middleman.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] mono-data text-[var(--text-muted)] tracking-wider mb-2">PROVIDER</label>
            <div className="flex gap-2">
              {(['openai', 'gemini'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex-1 px-3 py-3 text-xs font-semibold rounded-lg border transition-all ${
                    provider === p
                      ? 'bg-[var(--accent-purple)]/15 text-[var(--accent-purple)] border-[var(--accent-purple)]/30'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI' : 'Gemini — Free'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] mono-data text-[var(--text-muted)] tracking-wider mb-2">
              <Key className="w-3 h-3 inline mr-1" />
              API KEY
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full px-3 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm mono-data text-[var(--text-primary)] focus:border-[var(--accent-purple)] outline-none transition-colors placeholder-[var(--text-muted)]"
            />
            <p className="text-[10px] mono-data text-[var(--text-muted)] mt-1.5">
              {provider === 'openai'
                ? '→ platform.openai.com/api-keys'
                : '→ aistudio.google.com/apikey (free tier available)'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {getAIKey() && (
            <button onClick={handleClear} className="btn-ghost text-xs !text-[var(--accent-red)] !border-[var(--accent-red)]/30">
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {saved ? <><Check className="w-3.5 h-3.5 inline mr-1" />Done</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
