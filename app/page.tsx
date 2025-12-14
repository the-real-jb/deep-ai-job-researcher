'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap } from 'lucide-react';
import ModeToggle from '@/components/ModeToggle';
import ResumeUpload from '@/components/ResumeUpload';
import UrlInput from '@/components/UrlInput';
import LiveConsole from '@/components/LiveConsole';
import MatchTable from '@/components/MatchTable';
import ExportButtons from '@/components/ExportButtons';
import { JobMatch } from '@/lib/match';
import { CandidateProfile } from '@/lib/candidate';

type AnalysisMode = 'resume' | 'portfolio';

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

    addConsoleMessage('[INIT] Starting job search engine...');
    addConsoleMessage(`[UPLOAD] Received resume: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    addConsoleMessage('[PDF] Extracting text content from your resume...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      addConsoleMessage('[AI] Building your professional profile with AI...');
      addConsoleMessage('[PROFILE] Analyzing skills, experience, and career preferences...');

      const response = await fetch('/api/analyze/resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();

      // Show profile creation success
      addConsoleMessage('[SUCCESS] Profile created successfully!');
      if (data.candidate?.name) {
        addConsoleMessage(`[PROFILE] Welcome, ${data.candidate.name}!`);
      }
      if (data.candidate?.skills?.length > 0) {
        addConsoleMessage(`[SKILLS] Detected ${data.candidate.skills.length} skills: ${data.candidate.skills.slice(0, 5).join(', ')}${data.candidate.skills.length > 5 ? '...' : ''}`);
      }
      if (data.candidate?.yearsExperience) {
        addConsoleMessage(`[EXPERIENCE] ${data.candidate.yearsExperience} years of experience (${data.candidate.experienceLevel || 'mid'} level)`);
      }

      addConsoleMessage('[CRAWL] Searching job boards in parallel...');
      addConsoleMessage('[SOURCES] Indeed, LinkedIn, Google Jobs, RemoteOK, We Work Remotely, and more...');
      addConsoleMessage(`[FOUND] Discovered ${data.jobsFound} job opportunities across all sources`);

      addConsoleMessage('[AI] Using AI to analyze job compatibility...');
      addConsoleMessage('[MATCH] Scoring jobs based on skills, experience, and preferences...');

      if (data.matches.length > 0) {
        addConsoleMessage(`[SUCCESS] Found ${data.matches.length} quality matches for you!`);
        const topMatch = data.matches[0];
        addConsoleMessage(`[TOP] Best match: ${topMatch.title} at ${topMatch.company} (${topMatch.score}% match)`);
      } else {
        addConsoleMessage('[INFO] No strong matches found. Try updating your resume with more keywords.');
      }

      addConsoleMessage('[DONE] Analysis complete! Results are ready below.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        candidate: data.candidate,
        matches: data.matches,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Resume upload error:', error);
      addConsoleMessage(`[ERROR] Analysis failed: ${errorMessage}`);
      addConsoleMessage('[HELP] Please check your resume format and try again.');
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

    addConsoleMessage('[INIT] Starting job search engine...');
    addConsoleMessage(`[URL] Analyzing portfolio: ${url}`);
    addConsoleMessage('[SCRAPE] Fetching website content with Hyperbrowser...');

    try {
      addConsoleMessage('[AI] Extracting professional information from your portfolio...');
      addConsoleMessage('[PROFILE] Identifying skills, projects, and experience...');

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

      const data = await response.json();

      // Show profile creation success
      addConsoleMessage('[SUCCESS] Profile created from portfolio!');
      if (data.candidate?.name) {
        addConsoleMessage(`[PROFILE] Welcome, ${data.candidate.name}!`);
      }
      if (data.candidate?.skills?.length > 0) {
        addConsoleMessage(`[SKILLS] Found ${data.candidate.skills.length} skills: ${data.candidate.skills.slice(0, 5).join(', ')}${data.candidate.skills.length > 5 ? '...' : ''}`);
      }
      if (data.candidate?.topProjects?.length > 0) {
        addConsoleMessage(`[PROJECTS] Highlighted projects: ${data.candidate.topProjects.slice(0, 3).join(', ')}`);
      }

      addConsoleMessage('[CRAWL] Searching job boards in parallel...');
      addConsoleMessage('[SOURCES] Indeed, LinkedIn, Google Jobs, RemoteOK, We Work Remotely, and more...');
      addConsoleMessage(`[FOUND] Discovered ${data.jobsFound} job opportunities across all sources`);

      addConsoleMessage('[AI] Using AI to analyze job compatibility...');
      addConsoleMessage('[MATCH] Scoring jobs based on your portfolio skills and projects...');

      if (data.matches.length > 0) {
        addConsoleMessage(`[SUCCESS] Found ${data.matches.length} quality matches for you!`);
        const topMatch = data.matches[0];
        addConsoleMessage(`[TOP] Best match: ${topMatch.title} at ${topMatch.company} (${topMatch.score}% match)`);
      } else {
        addConsoleMessage('[INFO] No strong matches found. Try adding more projects to your portfolio.');
      }

      addConsoleMessage('[DONE] Analysis complete! Results are ready below.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        candidate: data.candidate,
        matches: data.matches,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Portfolio analysis error:', error);
      addConsoleMessage(`[ERROR] Analysis failed: ${errorMessage}`);
      addConsoleMessage('[HELP] Make sure the URL is accessible and contains portfolio content.');
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
            Powered by <span className="text-accent">Hyperbrowser</span> • Searching Indeed, LinkedIn, Google Jobs, and more
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
          ) : (
            <UrlInput
              onUrlSubmit={handlePortfolioSubmit}
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
