'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X } from 'lucide-react';

interface ResumeUploadProps {
  onFileUpload: (file: File) => void;
  isLoading?: boolean;
}

export default function ResumeUpload({ onFileUpload, isLoading }: ResumeUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'File must be a PDF';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    setError('');
    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleAnalyze = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto"
    >
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
          dragActive
            ? 'border-accent bg-accent/10'
            : selectedFile
            ? 'border-accent/50 bg-accent/5'
            : 'border-border hover:border-accent/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleInputChange}
          className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${
            selectedFile ? 'pointer-events-none' : ''
          }`}
          disabled={isLoading}
        />

        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-accent">
              <FileText size={24} />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <button
                onClick={clearFile}
                className="text-gray-500 hover:text-accent transition-colors"
                disabled={isLoading}
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto text-accent" size={48} />
            <div>
              <p className="text-lg font-medium text-foreground">
                Drop your resume here
              </p>
              <p className="text-sm mt-1 text-gray-500">
                or click to browse files
              </p>
            </div>
            <p className="text-xs text-gray-600">
              PDF only, max 5MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
} 