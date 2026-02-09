'use client';

import { useState, useEffect } from 'react';
import { Brain, Key, X, Check } from 'lucide-react';
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
    }, 800);
  };

  const handleClear = () => {
    setKey('');
    setAIKey(null);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">AI Features</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Enable AI-powered categorization and spending summaries. Your API key is stored locally in your browser — never sent to any server except the AI provider.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <div className="flex gap-2">
              <button
                onClick={() => setProvider('openai')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  provider === 'openai'
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                OpenAI
              </button>
              <button
                onClick={() => setProvider('gemini')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  provider === 'gemini'
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Gemini (Free)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key className="w-3.5 h-3.5 inline mr-1" />
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {provider === 'openai'
                ? 'Get yours at platform.openai.com/api-keys'
                : 'Get yours at aistudio.google.com/apikey'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {getAIKey() && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Remove Key
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
