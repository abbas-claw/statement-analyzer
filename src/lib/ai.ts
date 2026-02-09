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
  if (key) localStorage.setItem(AI_KEY_STORAGE, key);
  else localStorage.removeItem(AI_KEY_STORAGE);
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

// ---- OpenAI ----
async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenAIVision(apiKey: string, systemPrompt: string, textPrompt: string, imageBase64: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: textPrompt },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ---- Gemini ----
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
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGeminiVision(apiKey: string, systemPrompt: string, textPrompt: string, imageBase64: string): Promise<string> {
  // Extract mime type and data from base64 data URL
  const match = imageBase64.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data');
  const [, mimeType, data] = match;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [
            { text: textPrompt },
            { inlineData: { mimeType, data } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini Vision ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.candidates[0].content.parts[0].text;
}

// ---- Unified callers ----
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAIKey();
  if (!apiKey) throw new Error('No AI API key configured');
  return getAIProvider() === 'gemini'
    ? callGemini(apiKey, systemPrompt, userPrompt)
    : callOpenAI(apiKey, systemPrompt, userPrompt);
}

async function callAIVision(systemPrompt: string, textPrompt: string, imageBase64: string): Promise<string> {
  const apiKey = getAIKey();
  if (!apiKey) throw new Error('No AI API key configured');
  return getAIProvider() === 'gemini'
    ? callGeminiVision(apiKey, systemPrompt, textPrompt, imageBase64)
    : callOpenAIVision(apiKey, systemPrompt, textPrompt, imageBase64);
}

// ---- AI Categorization ----
export async function aiCategorize(transactions: Transaction[]): Promise<Transaction[]> {
  if (!isAIEnabled() || transactions.length === 0) return transactions;

  const items = transactions.map((t, i) => `${i}|${t.description}|${Math.abs(t.amount)}|${t.currency}`).join('\n');

  const systemPrompt = `You categorize bank transactions. Reply with ONLY a JSON array of category strings, one per transaction, in the same order.
Categories: ${DEFAULT_CATEGORIES.join(', ')}
Choose the single best category for each.`;

  const userPrompt = `Categorize these ${transactions.length} transactions (index|description|amount|currency):\n${items}`;

  try {
    const response = await callAI(systemPrompt, userPrompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return transactions;
    const categories: string[] = JSON.parse(jsonMatch[0]);
    return transactions.map((t, i) => ({
      ...t,
      category: categories[i] && DEFAULT_CATEGORIES.includes(categories[i]) ? categories[i] : t.category,
    }));
  } catch (err) {
    console.error('AI categorization failed:', err);
    return transactions;
  }
}

// ---- AI Summary ----
export async function aiSummarize(transactions: Transaction[]): Promise<string | null> {
  if (!isAIEnabled() || transactions.length === 0) return null;

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

// ---- Image OCR: Extract transactions from screenshots ----
export async function aiExtractFromImage(imageBase64: string, fileName: string): Promise<Transaction[]> {
  if (!isAIEnabled()) throw new Error('AI must be enabled to read screenshots');

  const systemPrompt = `You extract bank/card transactions from screenshots. Return ONLY a JSON array with this structure:
[{"date":"YYYY-MM-DD","description":"merchant name","amount":-123.45,"currency":"USD or PKR"}]
Rules:
- Expenses should have negative amounts
- Income/credits should have positive amounts  
- Detect currency from context (Rs/PKR or $/USD)
- Use YYYY-MM-DD date format
- If you can't parse a date, use the best guess
- Extract ALL visible transactions
- If no transactions found, return []`;

  const textPrompt = 'Extract all transactions from this bank/card statement screenshot. Return JSON only.';

  try {
    const response = await callAIVision(systemPrompt, textPrompt, imageBase64);
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const raw: { date: string; description: string; amount: number; currency: string }[] = JSON.parse(jsonMatch[0]);

    return raw.map((r, i) => {
      const category = categorizeByKeyword(r.description);
      return {
        id: `${fileName}-img-${i}-${Date.now()}`,
        date: r.date,
        description: r.description.substring(0, 100),
        amount: r.amount,
        currency: r.currency?.toUpperCase() || 'USD',
        category,
        sourceFile: fileName,
      };
    });
  } catch (err) {
    console.error('Image OCR failed:', err);
    throw err;
  }
}

// Quick keyword categorization for image-extracted transactions
import { CATEGORY_KEYWORDS } from './types';

function categorizeByKeyword(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'Other';
}
