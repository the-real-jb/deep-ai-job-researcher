'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Loader2 } from 'lucide-react';

interface LinkedInInputProps {
  onSubmit: (file: File, linkedInUrl: string) => void;
  isLoading: boolean;
}

export default function LinkedInInput({ onSubmit, isLoading }: LinkedInInputProps) {
  const [file, setFile] = useState<File | null>(null);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLinkedInUrl(url);

    if (url && !url.includes('linkedin.com')) {
      setError('Please enter a valid LinkedIn profile URL');
    } else {
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (!file) {
      setError('Please upload your resume PDF');
      return;
    }

    if (!linkedInUrl) {
      setError('Please enter your LinkedIn profile URL');
      return;
    }

    if (!linkedInUrl.includes('linkedin.com')) {
      setError('Please enter a valid LinkedIn URL');
      return;
    }

    setError(null);
    onSubmit(file, linkedInUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop a PDF file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="space-y-6">
        {/* Resume Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            1. Upload Your Resume
          </label>
          <div
            className="relative border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer bg-console"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('linkedin-file-input')?.click()}
          >
            <input
              id="linkedin-file-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />

            {file ? (
              <div className="flex items-center justify-center space-x-3 text-accent">
                <Upload size={24} />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-gray-400">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto text-gray-400" size={32} />
                <p className="text-gray-400">
                  Drop your resume PDF here or click to browse
                </p>
                <p className="text-xs text-gray-500">Maximum file size: 5MB</p>
              </div>
            )}
          </div>
        </div>

        {/* LinkedIn URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            2. Enter Your LinkedIn Profile URL
          </label>
          <div className="relative">
            <LinkIcon
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="url"
              value={linkedInUrl}
              onChange={handleUrlChange}
              placeholder="https://www.linkedin.com/in/yourprofile"
              className="w-full pl-12 pr-4 py-3 bg-console border border-border rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              disabled={isLoading}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Example: https://www.linkedin.com/in/john-doe-123456
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading || !file || !linkedInUrl}
          className={`w-full py-4 px-6 rounded-lg font-medium transition-all ${
            isLoading || !file || !linkedInUrl
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-accent text-background hover:bg-accent-hover'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <Loader2 className="animate-spin" size={20} />
              <span>Analyzing Profile & Finding Jobs...</span>
            </span>
          ) : (
            'Analyze LinkedIn Profile + Resume'
          )}
        </motion.button>

        {/* Info Card */}
        <div className="bg-console border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-accent mb-2">
            LinkedIn Mode Benefits:
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Combines resume and LinkedIn data for richer profile</li>
            <li>• Searches LinkedIn jobs with your top skills</li>
            <li>• Leverages endorsements and recommendations in matching</li>
            <li>• Provides targeted job matches from multiple sources</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
