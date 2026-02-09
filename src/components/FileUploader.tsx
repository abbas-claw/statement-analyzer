'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { parseCSV } from '@/lib/parser';

interface FileUploaderProps {
  onFilesParsed: (transactions: Transaction[]) => void;
}

export function FileUploader({ onFilesParsed }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  }, []);

  const processFiles = async (files: File[]) => {
    setProcessing(true);
    setError(null);
    
    const allTransactions: Transaction[] = [];

    for (const file of files) {
      try {
        const content = await readFileContent(file);
        
        if (file.name.endsWith('.csv')) {
          const transactions = parseCSV(content, file.name);
          allTransactions.push(...transactions);
        } else if (file.name.endsWith('.pdf')) {
          // PDF support will be added later
          setError('PDF support coming soon. Please use CSV for now.');
        } else {
          // Try to parse as CSV anyway
          const transactions = parseCSV(content, file.name);
          allTransactions.push(...transactions);
        }
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        setError(`Error parsing ${file.name}`);
      }
    }

    if (allTransactions.length > 0) {
      onFilesParsed(allTransactions);
    }
    
    setFiles(prev => [...prev, ...files]);
    setProcessing(false);
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }`}
      >
        <input
          type="file"
          multiple
          accept=".csv,.pdf,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop your statement files here
          </p>
          <p className="text-sm text-gray-500">
            or click to browse (CSV, PDF, Excel)
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-700 mb-3">Uploaded Files:</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
