import { Transaction, CATEGORY_KEYWORDS } from './types';
import { isValidTransaction } from './parser';

// Dynamically import pdfjs-dist to avoid SSR issues
async function getPDFModule() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  }
  return pdfjsLib;
}

/**
 * Extract structured lines from a PDF by grouping text items by their
 * Y-coordinate. This preserves the tabular row structure that .join(' ')
 * destroys.
 */
export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await getPDFModule();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y-coordinate (rounded to handle sub-pixel jitter)
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }

    // Sort rows top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...rows.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = rows.get(y)!;
      // Sort items left-to-right within the row
      items.sort((a, b) => a.x - b.x);
      const line = items.map(i => i.str).join(' ').trim();
      if (line) allLines.push(line);
    }
  }

  return allLines.join('\n');
}

// ---- Month lookup ----
const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// ---- Date patterns ----
// "Mon DD, YYYY"  — e.g. "Feb 07, 2026"
const DATE_MON_DD_YYYY = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/i;
// "DD Mon YYYY"   — e.g. "07 Feb 2026"
const DATE_DD_MON_YYYY = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i;
// "MM/DD/YYYY" or "MM-DD-YYYY"
const DATE_SLASH = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
// "YYYY-MM-DD"
const DATE_ISO = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/;

// Amount with optional sign, optional currency symbol, commas, decimals
// Captures: optional sign, digits with commas, decimal part
const AMOUNT_RE = /(-?)[\s]?[\$]?([\d,]+\.\d{2})\b/;

// Currency suffix after amount
const CURRENCY_SUFFIX = /\b(USD|PKR|EUR|GBP)\b/i;

// Lines to skip (headers, footers, page markers)
const SKIP_PATTERNS = [
  /document\s+number/i,
  /statement\s+period/i,
  /date\s+issued/i,
  /card\s+number/i,
  /client\s+number/i,
  /consolidated/i,
  /^date\s+description/i,
  /transaction\s+amount$/i,
  /redotpay\.com/i,
  /red\s+dot\s+technology/i,
  /queen.*road.*central/i,
  /room\s+\d+/i,
  /^\d+\/\d+$/, // page numbers like "1/4"
];

function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(line));
}

/**
 * Try to extract a date from a line. Returns { dateStr (normalized YYYY-MM-DD),
 * remainder (line with date removed) } or null.
 */
function extractDate(line: string): { dateStr: string; remainder: string } | null {
  // "Mon DD, YYYY"
  let m = line.match(DATE_MON_DD_YYYY);
  if (m) {
    const month = MONTHS[m[1].toLowerCase().substring(0, 3)];
    const day = m[2].padStart(2, '0');
    const year = m[3];
    return {
      dateStr: `${year}-${month}-${day}`,
      remainder: line.replace(m[0], '').trim(),
    };
  }

  // "DD Mon YYYY"
  m = line.match(DATE_DD_MON_YYYY);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTHS[m[2].toLowerCase().substring(0, 3)];
    const year = m[3];
    return {
      dateStr: `${year}-${month}-${day}`,
      remainder: line.replace(m[0], '').trim(),
    };
  }

  // "YYYY-MM-DD" (check before slash to avoid ambiguity)
  m = line.match(DATE_ISO);
  if (m) {
    // Avoid matching things like document numbers (20260209-9560)
    // A valid ISO date has month <= 12 and day <= 31
    const yr = parseInt(m[1]);
    const mo = parseInt(m[2]);
    const dy = parseInt(m[3]);
    if (yr >= 1990 && yr <= 2100 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      return {
        dateStr: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
        remainder: line.replace(m[0], '').trim(),
      };
    }
  }

  // "MM/DD/YYYY" or "MM-DD-YYYY"
  m = line.match(DATE_SLASH);
  if (m) {
    let [, p1, p2, p3] = m;
    let year = p3;
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return {
      dateStr: `${year}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`,
      remainder: line.replace(m[0], '').trim(),
    };
  }

  return null;
}

export function extractTransactionsFromPDFText(pdfText: string, fileName: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = pdfText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;
    if (shouldSkipLine(line)) continue;

    // Try to extract a date
    const dateResult = extractDate(line);
    if (!dateResult) continue;

    const { dateStr, remainder } = dateResult;

    // Try to extract an amount from the remainder
    const amountMatch = remainder.match(AMOUNT_RE);
    if (!amountMatch) continue;

    const sign = amountMatch[1] === '-' ? -1 : 1;
    const numStr = amountMatch[2].replace(/,/g, '');
    const amount = sign * parseFloat(numStr);
    if (isNaN(amount)) continue;

    // Detect per-transaction currency
    const currMatch = remainder.match(CURRENCY_SUFFIX);
    const currency = currMatch ? currMatch[1].toUpperCase() : 'USD';

    // Description = remainder minus amount and currency
    let description = remainder
      .replace(AMOUNT_RE, '')
      .replace(CURRENCY_SUFFIX, '')
      .replace(/^\s*[-–]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!description || description.length < 2) continue;

    const category = categorizeTransaction(description);

    const txn: Transaction = {
      id: `${fileName}-${i}-${Date.now()}`,
      date: dateStr,
      description: description.substring(0, 100),
      amount: amount < 0 ? amount : -Math.abs(amount), // expenses are negative
      currency,
      category,
      sourceFile: fileName,
    };

    if (isValidTransaction(txn)) {
      transactions.push(txn);
    }
  }

  return transactions;
}

function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}
