import { Transaction, CATEGORY_KEYWORDS } from './types';

// This function dynamically imports pdfjs-dist to avoid SSR issues
async function getPDFModule() {
  const pdfjsLib = await import('pdfjs-dist');
  // Set worker src to local file
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  }
  return pdfjsLib;
}

export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await getPDFModule();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

export function extractTransactionsFromPDFText(pdfText: string, fileName: string): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Detect currency from PDF text
  const currency = detectCurrency(pdfText);
  
  // Common PDF statement patterns
  // Looking for lines with date, description, and amount
  const lines = pdfText.split('\n');
  
  // Regex patterns for different date formats
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/, // MM/DD/YYYY or MM-DD-YY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,    // YYYY-MM-DD
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a]*\s+\d{2,4})/, // DD Mon YYYY
  ];
  
  // Look for amount patterns (with or without currency symbol)
  const amountPattern = /[\-\+]?\$?[\d,]+\.\d{2}/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try to extract date from line
    let dateMatch = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        dateMatch = match[1];
        break;
      }
    }
    
    if (!dateMatch) continue;
    
    // Look for amount in the line
    const amountMatch = line.match(amountPattern);
    if (!amountMatch) continue;
    
    // Extract amount
    let amountStr = amountMatch[0].replace(/[$,]/g, '');
    if (amountStr.includes('-') || line.toLowerCase().includes('debit') || 
        line.toLowerCase().includes('payment') || line.toLowerCase().includes('withdrawal')) {
      amountStr = '-' + amountStr.replace(/-/g, '');
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;
    
    // Extract description (everything that's not date or amount)
    let description = line
      .replace(dateMatch, '')
      .replace(amountMatch[0], '')
      .replace(/[\-\+]/g, '')
      .trim();
    
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    
    if (!description || description.length < 2) continue;
    
    // Auto-categorize
    const category = categorizeTransaction(description);
    
    transactions.push({
      id: `${fileName}-${i}-${Date.now()}`,
      date: formatDate(dateMatch),
      description: description.substring(0, 100),
      amount: amount,
      currency,
      category,
      sourceFile: fileName,
    });
  }
  
  return transactions;
}

function detectCurrency(content: string): string {
  // Check for PKR indicators
  if (content.toLowerCase().includes('pkr') || content.includes('Rs.') || content.toLowerCase().includes('rs ')) {
    return 'PKR';
  }
  return 'USD';
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

function formatDate(dateStr: string): string {
  // Try to normalize the date to YYYY-MM-DD format
  
  // Try MM/DD/YYYY or MM-DD-YYYY
  let match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    let [, month, day, year] = match;
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD
  match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  
  // Try DD Mon YYYY
  const months: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  match = dateStr.match(/(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{2,4})/);
  if (match) {
    const month = months[match[2].toLowerCase().substring(0, 3)] || '01';
    const day = match[1].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  // Return as-is if no format matched
  return dateStr;
}
