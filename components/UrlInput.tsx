'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight } from 'lucide-react';

interface UrlInputProps {
  onUrlSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function UrlInput({ onUrlSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validateUrl = (url: string): string | null => {
    if (!url) {
      return 'URL is required';
    }

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'URL must start with http:// or https://';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    onUrlSubmit(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://your-portfolio.com"
            className="w-full pl-10 pr-4 py-3 bg-console border border-border rounded-lg text-foreground placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !url}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          <span>{isLoading ? 'Analyzing Portfolio...' : 'Analyze Portfolio'}</span>
          {!isLoading && <ArrowRight size={16} />}
        </button>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="mt-6 p-4 bg-console/50 border border-border rounded-lg">
        <h3 className="text-sm font-medium text-accent mb-2">Portfolio Tips</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Ensure your portfolio is publicly accessible</li>
          <li>• Include project descriptions and technologies used</li>
          <li>• Make sure your contact information is visible</li>
        </ul>
      </div>
    </motion.div>
  );
} 