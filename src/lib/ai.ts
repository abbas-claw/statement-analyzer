import { Transaction, DEFAULT_CATEGORIES } from './types';

const AI_KEY_STORAGE = 'statement-analyzer-ai-key';
const AI_PROVIDER_STORAGE = 'statement-analyzer-ai-provider';

export type AIProvider = 'openai' | 'gemini';

export function getAIKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AI_KEY_STORAGE);
}

export function setAIKey(key: string | null) {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem(AI_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(AI_KEY_STORAGE);
  }
}

export function getAIProvider(): AIProvider {
  if (typeof window === 'undefined') return 'openai';
  return (localStorage.getItem(AI_PROVIDER_STORAGE) as AIProvider) || 'openai';
}

export function setAIProvider(provider: AIProvider) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_PROVIDER_STORAGE, provider);
}

export function isAIEnabled(): boolean {
  return !!getAIKey();
}

// ---- OpenAI API call ----
async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ---- Gemini API call ----
async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAIKey();
  if (!apiKey) throw new Error('No AI API key configured');

  const provider = getAIProvider();
  if (provider === 'gemini') {
    return callGemini(apiKey, systemPrompt, userPrompt);
  }
  return callOpenAI(apiKey, systemPrompt, userPrompt);
}

// ---- AI Categorization ----
export async function aiCategorize(transactions: Transaction[]): Promise<Transaction[]> {
  if (!isAIEnabled() || transactions.length === 0) return transactions;

  // Build a compact list for the AI
  const items = transactions.map((t, i) => `${i}|${t.description}|${Math.abs(t.amount)}|${t.currency}`).join('\n');

  const systemPrompt = `You categorize bank transactions. Reply with ONLY a JSON array of category strings, one per transaction, in the same order.
Categories: ${DEFAULT_CATEGORIES.join(', ')}
Choose the single best category for each transaction based on the merchant name/description.`;

  const userPrompt = `Categorize these ${transactions.length} transactions (format: index|description|amount|currency):\n${items}`;

  try {
    const response = await callAI(systemPrompt, userPrompt);

    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return transactions;

    const categories: string[] = JSON.parse(jsonMatch[0]);

    return transactions.map((t, i) => ({
      ...t,
      category: categories[i] && DEFAULT_CATEGORIES.includes(categories[i]) ? categories[i] : t.category,
    }));
  } catch (err) {
    console.error('AI categorization failed, using keyword fallback:', err);
    return transactions;
  }
}

// ---- AI Summary ----
export async function aiSummarize(transactions: Transaction[]): Promise<string | null> {
  if (!isAIEnabled() || transactions.length === 0) return null;

  // Build spending data
  const usdTotal = transactions.filter(t => t.currency === 'USD' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const pkrTotal = transactions.filter(t => t.currency === 'PKR' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const categoryTotals: Record<string, Record<string, number>> = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    if (!categoryTotals[t.category]) categoryTotals[t.category] = {};
    categoryTotals[t.category][t.currency] = (categoryTotals[t.category][t.currency] || 0) + Math.abs(t.amount);
  });

  const dateRange = transactions.map(t => t.date).sort();
  const items = transactions
    .filter(t => t.amount < 0)
    .map(t => `${t.date} | ${t.description} | ${Math.abs(t.amount)} ${t.currency} | ${t.category}`)
    .join('\n');

  const systemPrompt = `You analyze personal bank statements. Give a concise, insightful spending summary.
Be specific about patterns, biggest expenses, and actionable suggestions.
Use a friendly but direct tone. Format with markdown. Keep it under 300 words.`;

  const userPrompt = `Analyze this statement (${dateRange[0]} to ${dateRange[dateRange.length - 1]}):
Total: $${usdTotal.toFixed(2)} USD + Rs ${pkrTotal.toFixed(0)} PKR across ${transactions.length} transactions.

Category breakdown:
${Object.entries(categoryTotals).map(([cat, currencies]) => {
  const parts = Object.entries(currencies).map(([c, v]) => c === 'PKR' ? `Rs ${v.toFixed(0)}` : `$${v.toFixed(2)}`);
  return `- ${cat}: ${parts.join(' + ')}`;
}).join('\n')}

All transactions:
${items}`;

  try {
    return await callAI(systemPrompt, userPrompt);
  } catch (err) {
    console.error('AI summary failed:', err);
    return `Summary unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}
