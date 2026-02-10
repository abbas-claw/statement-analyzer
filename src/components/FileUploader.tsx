'use client';

import { useCallback, useState, useTransition } from 'react';
import { Upload, FileText, X, AlertCircle, Image, Camera } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { parseCSV } from '@/lib/parser';
import { isAIEnabled, aiExtractFromImage, aiCategorize } from '@/lib/ai';

interface FileUploaderProps {
  onFilesParsed: (transactions: Transaction[]) => void;
}

let parsePDFTransaction: ((file: File) => Promise<Transaction[]>) | null = null;

async function loadPDFParser(): Promise<(file: File) => Promise<Transaction[]>> {
  if (!parsePDFTransaction) {
    const pdfModule = await import('@/lib/pdf-parser');
    parsePDFTransaction = async (file: File) => {
      const pdfText = await pdfModule.parsePDF(file);
      return pdfModule.extractTransactionsFromPDFText(pdfText, file.name);
    };
  }
  return parsePDFTransaction;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|heic)$/i.test(file.name);
}

export function FileUploader({ onFilesParsed }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  }, []);

  const processFiles = async (filesToProcess: File[]) => {
    startTransition(() => {
      setProcessing(true);
      setError(null);
    });

    const allTransactions: Transaction[] = [];

    for (const file of filesToProcess) {
      try {
        startTransition(() => setProcessingFile(file.name));

        if (isImageFile(file)) {
          if (!isAIEnabled()) {
            startTransition(() => setError(`Enable AI to extract transactions from screenshots.`));
            continue;
          }
          const base64 = await fileToBase64(file);
          const transactions = await aiExtractFromImage(base64, file.name);
          if (transactions.length === 0) {
            startTransition(() => setError(`No transactions found in ${file.name}. Make sure the screenshot shows transaction details clearly.`));
          }
          allTransactions.push(...transactions);
        } else if (file.name.endsWith('.pdf')) {
          const pdfParser = await loadPDFParser();
          let transactions = await pdfParser(file);
          if (isAIEnabled() && transactions.length > 0) {
            transactions = await aiCategorize(transactions);
          }
          allTransactions.push(...transactions);
        } else {
          const content = await readFileContent(file);
          let transactions = parseCSV(content, file.name);
          if (isAIEnabled() && transactions.length > 0) {
            transactions = await aiCategorize(transactions);
          }
          allTransactions.push(...transactions);
        }
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        startTransition(() => setError(`Error parsing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    }

    if (allTransactions.length > 0) {
      onFilesParsed(allTransactions);
    }

    startTransition(() => {
      setFiles(prev => [...prev, ...filesToProcess]);
      setProcessing(false);
      setProcessingFile(null);
    });
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const aiOn = isAIEnabled();

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging
            ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/5'
            : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)]'
          }`}
      >
        <input
          type="file"
          multiple
          accept=".csv,.pdf,.png,.jpg,.jpeg,.webp,.heic"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />

        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/20 flex items-center justify-center">
              <Upload className="w-7 h-7 text-[var(--accent-teal)]" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-1">
            Drop files here
          </p>
          <p className="text-xs text-[var(--text-muted)] mono-data">
            CSV, PDF{aiOn ? ', PNG, JPG — AI reads screenshots' : ''}
          </p>
          {aiOn && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
              <Camera className="w-3 h-3 text-[var(--accent-purple)]" />
              <span className="text-[10px] mono-data text-[var(--accent-purple)]">AI Screenshot Reading Active</span>
            </div>
          )}
        </label>
      </div>

      {processing && (
        <div className="mt-4 rounded-lg p-4 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[var(--accent-amber)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--accent-amber)] mono-data">Processing {processingFile}...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--accent-red)] flex-shrink-0" />
          <span className="text-xs text-[var(--accent-red)]">{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[10px] mono-data text-[var(--text-muted)] tracking-wider mb-3">UPLOADED</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 glass-card-flat">
                <div className="flex items-center gap-3 min-w-0">
                  {isImageFile(file) ? (
                    <Image className="w-4 h-4 text-[var(--accent-purple)] flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                  )}
                  <span className="text-xs text-[var(--text-primary)] truncate">{file.name}</span>
                  <span className="text-[10px] mono-data text-[var(--text-muted)] flex-shrink-0">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </div>
                <button onClick={() => removeFile(index)} className="p-1 hover:text-[var(--accent-red)] text-[var(--text-muted)] transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
