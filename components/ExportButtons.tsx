'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Table, CheckCircle } from 'lucide-react';
import { JobMatch, formatMatchesForExport } from '@/lib/match';
import { CandidateProfile } from '@/lib/candidate';

interface ExportButtonsProps {
  matches: JobMatch[];
  candidate: CandidateProfile;
}

export default function ExportButtons({ matches, candidate }: ExportButtonsProps) {
  const [exportedFormats, setExportedFormats] = useState<Set<string>>(new Set());

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const data = formatMatchesForExport(matches, candidate);
    const content = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `job-matches-${timestamp}.json`;
    
    downloadFile(content, filename, 'application/json');
    
    setExportedFormats(prev => new Set(prev).add('json'));
    setTimeout(() => {
      setExportedFormats(prev => {
        const newSet = new Set(prev);
        newSet.delete('json');
        return newSet;
      });
    }, 2000);
  };

  const exportAsCSV = () => {
    const headers = [
      'Title',
      'Company',
      'Score',
      'Location',
      'Remote',
      'Source',
      'Missing Skills',
      'Pitch',
      'URL'
    ];

    const rows = matches.map(match => [
      match.title,
      match.company,
      match.score.toString(),
      match.location || '',
      match.remote ? 'Yes' : 'No',
      match.source,
      match.missingSkills.join('; '),
      match.pitch,
      match.url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `job-matches-${timestamp}.csv`;
    
    downloadFile(csvContent, filename, 'text/csv');
    
    setExportedFormats(prev => new Set(prev).add('csv'));
    setTimeout(() => {
      setExportedFormats(prev => {
        const newSet = new Set(prev);
        newSet.delete('csv');
        return newSet;
      });
    }, 2000);
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto mt-8"
    >
      <div className="bg-console border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Export Results
            </h3>
            <p className="text-sm text-foreground/60">
              Download your job matches for further analysis or sharing
            </p>
          </div>
          <Download className="text-accent" size={24} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={exportAsJSON}
            className="flex-1 btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            {exportedFormats.has('json') ? (
              <>
                <CheckCircle size={16} />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Download JSON</span>
              </>
            )}
          </button>

          <button
            onClick={exportAsCSV}
            className="flex-1 btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            {exportedFormats.has('csv') ? (
              <>
                <CheckCircle size={16} />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Table size={16} />
                <span>Download CSV</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 p-3 bg-console/50 border border-border rounded-lg">
          <div className="text-xs text-foreground/60">
            <div className="font-medium text-accent mb-1">Export Information:</div>
            <ul className="space-y-1">
              <li>• JSON: Complete data with candidate profile and match details</li>
              <li>• CSV: Spreadsheet-friendly format for analysis in Excel/Google Sheets</li>
              <li>• Both formats include match scores, missing skills, and generated pitches</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 