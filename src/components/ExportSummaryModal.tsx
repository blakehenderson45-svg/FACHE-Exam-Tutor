import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  generateSummaryText,
  generateSummaryMarkdown,
  generateSummaryPdf,
  downloadFile,
  computeDomainAnalysis,
  ExportDataOptions
} from '../services/exportService';
import { PASSING_BENCHMARK } from './ProgressAnalytics';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
}

export default function ExportSummaryModal({
  isOpen,
  onClose,
  user,
  profile
}: ExportSummaryModalProps) {
  const [includeScorecard, setIncludeScorecard] = useState(true);
  const [includeStudyChecklist, setIncludeStudyChecklist] = useState(true);
  const [includeStoredInsights, setIncludeStoredInsights] = useState(true);
  const [previewTab, setPreviewTab] = useState<'formatted' | 'text' | 'markdown'>('formatted');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const domainScores = profile?.domainScores || {};
  const overallScore = typeof profile?.overallScore === 'number' ? profile.overallScore : undefined;
  const strengths = Array.isArray(profile?.strengths) ? profile.strengths : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];
  const candidateName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Healthcare Executive Candidate';
  const candidateEmail = user?.email || profile?.email || '';
  const targetDate = profile?.targetDate || '';

  const exportOptions: ExportDataOptions = useMemo(
    () => ({
      candidateName,
      candidateEmail,
      targetDate,
      domainScores,
      overallScore,
      strengths,
      weaknesses,
      includeScorecard,
      includeStudyChecklist,
      includeStoredInsights
    }),
    [
      candidateName,
      candidateEmail,
      targetDate,
      domainScores,
      overallScore,
      strengths,
      weaknesses,
      includeScorecard,
      includeStudyChecklist,
      includeStoredInsights
    ]
  );

  const analysis = useMemo(() => computeDomainAnalysis(domainScores), [domainScores]);
  const textSummary = useMemo(() => generateSummaryText(exportOptions), [exportOptions]);
  const markdownSummary = useMemo(() => generateSummaryMarkdown(exportOptions), [exportOptions]);

  if (!isOpen) return null;

  // Handle PDF Export
  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      const pdf = generateSummaryPdf(exportOptions);
      const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `ACHE_Exam_Strengths_Weaknesses_${safeName}.pdf`;
      pdf.save(filename);
      setDownloadSuccessMessage(`PDF downloaded: ${filename}`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Text Export
  const handleExportText = () => {
    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ACHE_Exam_Strengths_Weaknesses_${safeName}.txt`;
    downloadFile(textSummary, filename, 'text/plain;charset=utf-8');
    setDownloadSuccessMessage(`Text file downloaded: ${filename}`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // Handle Markdown Export
  const handleExportMarkdown = () => {
    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ACHE_Exam_Strengths_Weaknesses_${safeName}.md`;
    downloadFile(markdownSummary, filename, 'text/markdown;charset=utf-8');
    setDownloadSuccessMessage(`Markdown file downloaded: ${filename}`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // Handle Copy to Clipboard
  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Handle Print via Browser
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Export Offline Review Summary
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  PDF & Plain Text
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download your domain-specific strengths, weaknesses, and offline study guide for review without an internet connection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast banner */}
        {downloadSuccessMessage && (
          <div className="bg-emerald-500 text-white text-xs font-semibold px-6 py-2.5 flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {downloadSuccessMessage}
            </span>
            <button
              onClick={() => setDownloadSuccessMessage(null)}
              className="text-white/80 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body: Settings & Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Overall Index
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {analysis.compositeScore.toFixed(2)} / 5.0
              </span>
              <span className="text-[10px] text-slate-500 block">
                Target: {PASSING_BENCHMARK} / 5.0
              </span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block uppercase">
                Peak Strength
              </span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 truncate block">
                {analysis.top3Strengths[0]?.domain.title || 'In Assessment'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Score: {analysis.top3Strengths[0]?.score.toFixed(1) || '0.0'}/5.0
              </span>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block uppercase">
                Primary Focus
              </span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 truncate block">
                {analysis.top3Weaknesses[0]?.domain.title || 'None identified'}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                Score: {analysis.top3Weaknesses[0]?.score.toFixed(1) || '0.0'}/5.0
              </span>
            </div>

            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block uppercase">
                Exam Benchmark
              </span>
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200 block">
                {analysis.isPassingOverall ? 'Passing Level' : 'Needs Review'}
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                {analysis.strengthsList.length} of 10 domains &gt;= 3.8
              </span>
            </div>
          </div>

          {/* Export Customization Options */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
              Customize Report Sections
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeScorecard}
                  onChange={(e) => setIncludeScorecard(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">Complete 10-Domain Scorecard</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeStudyChecklist}
                  onChange={(e) => setIncludeStudyChecklist(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">Offline Study Prompts & Drills</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeStoredInsights}
                  onChange={(e) => setIncludeStoredInsights(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">AI Clinical & Strategic Insights</span>
              </label>
            </div>
          </div>

          {/* Document Preview Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1">
                <button
                  onClick={() => setPreviewTab('formatted')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    previewTab === 'formatted'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Formatted Report Preview
                </button>
                <button
                  onClick={() => setPreviewTab('text')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    previewTab === 'text'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Plain Text (.txt)
                </button>
                <button
                  onClick={() => setPreviewTab('markdown')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    previewTab === 'markdown'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Markdown (.md)
                </button>
              </div>

              <button
                onClick={handleCopyClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Copy formatted text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy Text'}
              </button>
            </div>

            {/* Preview Container */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/60 max-h-[380px] overflow-y-auto">
              {previewTab === 'formatted' ? (
                <div className="p-6 space-y-6 text-sm text-slate-800 dark:text-slate-200">
                  {/* Executive Header Box */}
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Official ACHE Competency Diagnostic Summary
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {candidateName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target Exam: {targetDate || '2026 Board of Governors'} • Generated: {new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {/* Primary Strengths Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Domain Strengths &amp; High Competencies
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {analysis.top3Strengths.map((item, idx) => (
                        <div
                          key={item.domain.key}
                          className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {idx + 1}. {item.domain.title}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">
                                {item.domain.weight}% Exam Weight
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {item.domain.keyTopics.join(' • ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                              {item.score.toFixed(1)} / 5.0
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              +{item.gap > 0 ? item.gap : 0} above benchmark
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {includeStoredInsights && strengths.length > 0 && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-200/50 dark:border-emerald-900/30">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 block mb-1">
                          Diagnostic Assessment Insights:
                        </span>
                        <ul className="space-y-1">
                          {strengths.slice(0, 3).map((s, i) => (
                            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Priority Weaknesses Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Priority Weaknesses &amp; Remediation Targets
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {analysis.top3Weaknesses.map((item, idx) => {
                        const deficit = Math.max(0, PASSING_BENCHMARK - item.score).toFixed(1);
                        return (
                          <div
                            key={item.domain.key}
                            className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {idx + 1}. {item.domain.title}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                                  {item.domain.weight}% Exam Weight
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                Priority Topics: <span className="font-medium text-slate-800 dark:text-slate-200">{item.domain.keyTopics.join(' • ')}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                                {item.score.toFixed(1)} / 5.0
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                                Deficit: -{deficit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {includeStoredInsights && weaknesses.length > 0 && (
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-900/30">
                        <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 block mb-1">
                          Diagnostic Remediation Focus Points:
                        </span>
                        <ul className="space-y-1">
                          {weaknesses.slice(0, 3).map((w, i) => (
                            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">▲</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 10 Domain Table Preview */}
                  {includeScorecard && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Full 10-Domain Competency Scorecard
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                            <tr>
                              <th className="p-2.5">Domain</th>
                              <th className="p-2.5 text-center">Weight</th>
                              <th className="p-2.5 text-center">Score</th>
                              <th className="p-2.5 text-center">Target</th>
                              <th className="p-2.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {analysis.analyses.map((item) => (
                              <tr key={item.domain.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                                  {item.domain.title}
                                </td>
                                <td className="p-2.5 text-center text-slate-500">
                                  {item.domain.weight}%
                                </td>
                                <td className="p-2.5 text-center font-bold">
                                  <span className={item.score >= PASSING_BENCHMARK ? 'text-emerald-600' : 'text-amber-600'}>
                                    {item.score.toFixed(1)} / 5.0
                                  </span>
                                </td>
                                <td className="p-2.5 text-center text-slate-400">
                                  3.8 / 5.0
                                </td>
                                <td className="p-2.5 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      item.score >= 4.5
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                        : item.score >= PASSING_BENCHMARK
                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                                        : item.score >= 3.0
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                    }`}
                                  >
                                    {item.score >= 4.5 ? 'Exemplary' : item.score >= PASSING_BENCHMARK ? 'Proficient' : item.score >= 3.0 ? 'Borderline' : 'Needs Focus'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Offline Study Checklist Preview */}
                  {includeStudyChecklist && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> High-Yield Offline Review Prompts Included
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        The downloaded export includes scenario-based self-quizzing questions and an offline executive study log designed for studying during commutes, flights, or printed binder review.
                      </p>
                    </div>
                  )}
                </div>
              ) : previewTab === 'text' ? (
                <pre className="p-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre leading-relaxed select-all">
                  {textSummary}
                </pre>
              ) : (
                <pre className="p-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre leading-relaxed select-all">
                  {markdownSummary}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Action Buttons */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              title="Print directly or use browser Save to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
            <button
              onClick={handleExportMarkdown}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              title="Download as GitHub-flavored Markdown (.md)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
              Markdown (.md)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportText}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Download Text (.txt)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExportingPdf ? 'Generating PDF...' : 'Download PDF (.pdf)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
