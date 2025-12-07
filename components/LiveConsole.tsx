'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

interface LiveConsoleProps {
  messages: string[];
  isVisible: boolean;
}

export default function LiveConsole({ messages, isVisible }: LiveConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessage = (message: string) => {
    // Extract type from message format [TYPE] message
    const match = message.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (!match) return { type: 'info', text: message };

    const [, type, text] = match;
    return { type: type.toLowerCase(), text };
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'crawl':
        return 'text-blue-400';
      case 'parse':
        return 'text-yellow-400';
      case 'llm':
        return 'text-purple-400';
      case 'complete':
        return 'text-accent';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-foreground/80';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-4xl mx-auto mt-8"
        >
          <div className="console p-4">
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-border">
              <Terminal size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent">Live Console</span>
              <div className="flex-1" />
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <div className="w-2 h-2 bg-accent rounded-full" />
              </div>
            </div>

            <div
              ref={consoleRef}
              className="font-mono text-sm max-h-60 overflow-y-auto space-y-1"
            >
              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const { type, text } = formatMessage(message);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start space-x-2"
                    >
                      <span className="text-accent/60 select-none shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`${getMessageColor(type)} break-words`}>
                        {text}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {messages.length === 0 && (
                <div className="text-foreground/40 italic">
                  Waiting for analysis to begin...
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border">
                <div className="flex items-center space-x-2 text-xs text-foreground/60">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span>Processing...</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 