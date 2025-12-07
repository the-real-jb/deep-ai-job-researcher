'use client';

import { motion } from 'framer-motion';

interface ModeToggleProps {
  mode: 'resume' | 'portfolio' | 'linkedin';
  onModeChange: (mode: 'resume' | 'portfolio' | 'linkedin') => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const getPosition = () => {
    if (mode === 'resume') return '4px';
    if (mode === 'portfolio') return 'calc(33.33% + 2px)';
    return 'calc(66.66% + 0px)';
  };

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="relative bg-console border border-border rounded-lg p-1">
        <motion.div
          className="absolute top-1 bottom-1 bg-accent rounded-md"
          initial={false}
          animate={{
            left: getPosition(),
            width: 'calc(33.33% - 6px)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        <div className="relative flex">
          <button
            onClick={() => onModeChange('resume')}
            className={`px-5 py-2 text-sm font-medium transition-colors duration-200 relative z-10 rounded-md ${
              mode === 'resume' ? 'text-background' : 'text-foreground hover:text-accent'
            }`}
          >
            Resume
          </button>
          <button
            onClick={() => onModeChange('portfolio')}
            className={`px-5 py-2 text-sm font-medium transition-colors duration-200 relative z-10 rounded-md ${
              mode === 'portfolio' ? 'text-background' : 'text-foreground hover:text-accent'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => onModeChange('linkedin')}
            className={`px-5 py-2 text-sm font-medium transition-colors duration-200 relative z-10 rounded-md ${
              mode === 'linkedin' ? 'text-background' : 'text-foreground hover:text-accent'
            }`}
          >
            LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
} 