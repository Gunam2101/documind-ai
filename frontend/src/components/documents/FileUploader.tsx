import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { documentApi } from '../../services/documentApi';
import { ProgressBar } from '../ui/ProgressBar';
import { Document } from '../../types';
import { formatBytes } from '../../lib/utils';

export interface FileUploaderProps {
  onSuccess?: (doc: Document) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const doc = await documentApi.upload(file, (pct) => {
        setUploadProgress(Math.min(95, pct));
      });
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        if (onSuccess) onSuccess(doc);
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Document upload failed.');
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isUploading ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[0.99]'
              : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 bg-gray-50/50 dark:bg-dark-card/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Drop your PDF here, or <span className="text-brand-600 dark:text-brand-400 underline">Browse files</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supports PDF files up to 25MB</p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedFile?.name}</p>
              <p className="text-xs text-gray-400">{formatBytes(selectedFile?.size || 0)}</p>
            </div>
          </div>
          <ProgressBar progress={uploadProgress} stage={uploadProgress === 100 ? 'Ready!' : 'Uploading & Processing PDF...'} />
        </div>
      )}
    </div>
  );
};
