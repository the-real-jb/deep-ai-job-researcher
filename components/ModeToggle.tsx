'use client';

import { motion } from 'framer-motion';

interface ModeToggleProps {
  mode: 'resume' | 'portfolio';
  onModeChange: (mode: 'resume' | 'portfolio') => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="relative bg-console border border-border rounded-lg p-1">
        <motion.div
          className="absolute top-1 bottom-1 bg-accent rounded-md"
          initial={false}
          animate={{
            left: mode === 'resume' ? '4px' : 'calc(50% + 2px)',
            width: 'calc(50% - 6px)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        <div className="relative flex">
          <button
            onClick={() => onModeChange('resume')}
            className={`px-6 py-2 text-sm font-medium transition-colors duration-200 relative z-10 rounded-md ${
              mode === 'resume' ? 'text-background' : 'text-foreground hover:text-accent'
            }`}
            data-cy="mode-toggle-resume"
          >
            Resume
          </button>
          <button
            onClick={() => onModeChange('portfolio')}
            className={`px-6 py-2 text-sm font-medium transition-colors duration-200 relative z-10 rounded-md ${
              mode === 'portfolio' ? 'text-background' : 'text-foreground hover:text-accent'
            }`}
            data-cy="mode-toggle-portfolio"
          >
            Portfolio
          </button>
        </div>
      </div>
    </div>
  );
} 