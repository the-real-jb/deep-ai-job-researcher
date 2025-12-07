'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap } from 'lucide-react';
import ModeToggle from '@/components/ModeToggle';
import ResumeUpload from '@/components/ResumeUpload';
import UrlInput from '@/components/UrlInput';
import LinkedInInput from '@/components/LinkedInInput';
import LiveConsole from '@/components/LiveConsole';
import MatchTable from '@/components/MatchTable';
import ExportButtons from '@/components/ExportButtons';
import { JobMatch } from '@/lib/match';
import { CandidateProfile } from '@/lib/candidate';

type AnalysisMode = 'resume' | 'portfolio' | 'linkedin';

interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  candidate: CandidateProfile | null;
  matches: JobMatch[];
  consoleMessages: string[];
}

export default function HomePage() {
  const [mode, setMode] = useState<AnalysisMode>('resume');
  const [state, setState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    candidate: null,
    matches: [],
    consoleMessages: [],
  });

  const addConsoleMessage = (message: string) => {
    setState(prev => ({
      ...prev,
      consoleMessages: [...prev.consoleMessages, message],
    }));
  };

  const resetState = () => {
    setState({
      isLoading: false,
      error: null,
      candidate: null,
      matches: [],
      consoleMessages: [],
    });
  };

  const handleResumeUpload = async (file: File) => {
    resetState();
    setState(prev => ({ ...prev, isLoading: true }));
    
    addConsoleMessage('[START] Beginning resume analysis...');
    addConsoleMessage('[PDF] Extracting text from resume...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      addConsoleMessage('[PROFILE] Building candidate profile with AI...');
      
      const response = await fetch('/api/analyze/resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      addConsoleMessage('[CRAWL] Starting job board crawling...');
      addConsoleMessage('[SCRAPE] Gathering live job postings...');
      
      const data = await response.json();

      addConsoleMessage(`[PARSE] Found ${data.jobsFound} job opportunities`);
      addConsoleMessage('[LLM] Analyzing job matches with AI...');
      addConsoleMessage(`[COMPLETE] Analysis complete! Found ${data.matches.length} quality matches`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        candidate: data.candidate,
        matches: data.matches,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Resume upload error:', error);
      addConsoleMessage(`[ERROR] ${errorMessage}`);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handlePortfolioSubmit = async (url: string) => {
    resetState();
    setState(prev => ({ ...prev, isLoading: true }));
    
    addConsoleMessage('[START] Beginning portfolio analysis...');
    addConsoleMessage(`[SCRAPE] Scraping portfolio: ${url}`);

    try {
      addConsoleMessage('[PROFILE] Building candidate profile from portfolio...');
      
      const response = await fetch('/api/analyze/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      addConsoleMessage('[CRAWL] Starting job board crawling...');
      addConsoleMessage('[SCRAPE] Gathering live job postings...');
      
      const data = await response.json();

      addConsoleMessage(`[PARSE] Found ${data.jobsFound} job opportunities`);
      addConsoleMessage('[LLM] Analyzing job matches with AI...');
      addConsoleMessage(`[COMPLETE] Analysis complete! Found ${data.matches.length} quality matches`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        candidate: data.candidate,
        matches: data.matches,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addConsoleMessage(`[ERROR] ${errorMessage}`);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handleLinkedInSubmit = async (file: File, linkedInUrl: string) => {
    resetState();
    setState(prev => ({ ...prev, isLoading: true }));

    addConsoleMessage('[START] Beginning LinkedIn enhanced analysis...');
    addConsoleMessage('[PDF] Extracting text from resume...');
    addConsoleMessage(`[LINKEDIN] Scraping profile: ${linkedInUrl}`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('linkedInUrl', linkedInUrl);

      addConsoleMessage('[PROFILE] Building enhanced candidate profile...');
      addConsoleMessage('[LINKEDIN] Merging resume + LinkedIn data...');

      const response = await fetch('/api/analyze/linkedin', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      addConsoleMessage('[CRAWL] Searching LinkedIn jobs with your skills...');
      addConsoleMessage('[CRAWL] Also checking other job boards...');

      const data = await response.json();

      addConsoleMessage(`[PARSE] Found ${data.linkedInJobsFound} LinkedIn jobs`);
      addConsoleMessage(`[PARSE] Found ${data.otherJobsFound} jobs from other sources`);
      addConsoleMessage('[LLM] Analyzing job matches with enhanced profile...');
      addConsoleMessage(`[COMPLETE] Analysis complete! Found ${data.matches.length} quality matches`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        candidate: data.candidate,
        matches: data.matches,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('LinkedIn analysis error:', error);
      addConsoleMessage(`[ERROR] ${errorMessage}`);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    resetState();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Search className="text-accent" size={32} />
            <h1 className="text-4xl font-bold text-foreground">
              Deep Job Researcher
            </h1>
            <Zap className="text-accent" size={32} />
          </div>
          <p className="text-lg max-w-2xl mx-auto text-gray-300">
            AI-powered job matching using real-time web scraping. Upload your resume 
            or share your portfolio to find personalized job opportunities.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Powered by <span className="text-accent">Hyperbrowser</span> • Built with OpenAI
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <ModeToggle mode={mode} onModeChange={handleModeChange} />

        {/* Input Section */}
        <div className="mb-12">
          {mode === 'resume' ? (
            <ResumeUpload
              onFileUpload={handleResumeUpload}
              isLoading={state.isLoading}
            />
          ) : mode === 'portfolio' ? (
            <UrlInput
              onUrlSubmit={handlePortfolioSubmit}
              isLoading={state.isLoading}
            />
          ) : (
            <LinkedInInput
              onSubmit={handleLinkedInSubmit}
              isLoading={state.isLoading}
            />
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            <div className="font-medium mb-1">Analysis Failed</div>
            <div className="text-sm">{state.error}</div>
          </motion.div>
        )}

        {/* Live Console */}
        <LiveConsole 
          messages={state.consoleMessages} 
          isVisible={state.isLoading || state.consoleMessages.length > 0} 
        />

        {/* Results */}
        {state.candidate && state.matches.length > 0 && (
          <>
            <MatchTable matches={state.matches} candidate={state.candidate} />
            <ExportButtons matches={state.matches} candidate={state.candidate} />
          </>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center text-sm text-gray-500"
        >
          <div className="mb-2">
            Built with{' '}
            <a 
              href="https://hyperbrowser.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Hyperbrowser
            </a>
          </div>
          <div>
            No mock data • Real-time job crawling • AI-powered matching
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
