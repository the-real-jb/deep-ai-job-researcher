'use client';

import { motion } from 'framer-motion';
import { ExternalLink, MapPin, Monitor, Copy, CheckCircle } from 'lucide-react';
import { JobMatch } from '@/lib/match';
import { CandidateProfile } from '@/lib/candidate';
import { generateOutreachEmail } from '@/lib/match';
import { useState } from 'react';

interface MatchTableProps {
  matches: JobMatch[];
  candidate: CandidateProfile;
}

export default function MatchTable({ matches, candidate }: MatchTableProps) {
  const [copiedEmails, setCopiedEmails] = useState<Set<string>>(new Set());

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-accent';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-accent';
    if (score >= 60) return 'bg-yellow-400';
    if (score >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const copyOutreachEmail = async (match: JobMatch) => {
    const email = generateOutreachEmail(match, candidate);
    await navigator.clipboard.writeText(email);
    
    setCopiedEmails(prev => new Set(prev).add(match.url));
    setTimeout(() => {
      setCopiedEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(match.url);
        return newSet;
      });
    }, 2000);
  };

  if (matches.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="text-foreground/60 text-lg">No job matches found</div>
        <div className="text-foreground/40 text-sm mt-2">
          Try adjusting your profile or wait for more job sources to be crawled
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto mt-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Job Matches ({matches.length})
        </h2>
        <div className="text-foreground/60 text-sm">
          Ranked by compatibility score • Generated with AI analysis
        </div>
      </div>

      <div className="space-y-4">
        {matches.map((match, index) => (
          <motion.div
            key={`${match.title}-${match.company}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-console border border-border rounded-lg p-6 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {match.title}
                  </h3>
                  <a
                    href={match.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-foreground/80 mb-3">
                  <span className="font-medium">{match.company}</span>
                  {match.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin size={14} />
                      <span>{match.location}</span>
                    </div>
                  )}
                  {match.remote && (
                    <div className="flex items-center space-x-1">
                      <Monitor size={14} />
                      <span>Remote</span>
                    </div>
                  )}
                  <span className="text-foreground/60">• {match.source}</span>
                </div>

                <p className="text-foreground/80 text-sm leading-relaxed mb-3">
                  {match.pitch}
                </p>

                {match.missingSkills.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-foreground/60 mb-1">
                      Skills to develop:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {match.missingSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="ml-6 text-right">
                <div className="mb-2">
                  <span className={`text-2xl font-bold ${getScoreColor(match.score)}`}>
                    {match.score}
                  </span>
                  <span className="text-foreground/60 text-sm ml-1">%</span>
                </div>
                
                <div className="w-20 h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full ${getScoreBarColor(match.score)} transition-all duration-500`}
                    style={{ width: `${match.score}%` }}
                  />
                </div>

                <button
                  onClick={() => copyOutreachEmail(match)}
                  className="btn-secondary text-xs px-3 py-1 flex items-center space-x-1"
                >
                  {copiedEmails.has(match.url) ? (
                    <>
                      <CheckCircle size={12} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-console/50 border border-border rounded-lg">
        <div className="text-sm text-foreground/60">
          <div className="font-medium text-accent mb-2">Match Score Guide:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full" />
              <span>80-100: Excellent fit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <span>60-79: Good match</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full" />
              <span>40-59: Potential fit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span>30-39: Stretch goal</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 