import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Zap,
  TrendingDown,
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock,
  Compass,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ListChecks,
  ChevronRight,
  Download
} from 'lucide-react';
import { ACHE_DOMAINS, DomainMetadata } from './ProgressAnalytics';
import ExportSummaryModal from './ExportSummaryModal';

interface StudyRoadmapProps {
  domainScores?: Record<string, number> | null;
  overallScore?: number;
  onLaunchFocusedSession?: (domainKey: string, domainTitle: string) => void;
  className?: string;
  user?: any;
  profile?: any;
}

export interface FocusDomainItem extends DomainMetadata {
  score: number;
  priorityRank: number; // 1, 2, 3
  status: 'critical' | 'needs_work' | 'progressing' | 'unassessed';
  gapToBenchmark: number;
  recommendation: string;
  estimatedMinutes: number;
}

export default function StudyRoadmap({
  domainScores,
  overallScore = 0,
  onLaunchFocusedSession,
  className = '',
  user,
  profile
}: StudyRoadmapProps) {
  const navigate = useNavigate();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Compute top 3 focus domains based on lowest scores in Firestore domainScores
  const { top3Domains, hasAnyScores, totalCoveragePercent } = useMemo(() => {
    const rawScores = domainScores || {};

    // Map all 10 domains with their score
    const scoredList = ACHE_DOMAINS.map(domain => {
      const rawVal = rawScores[domain.key];
      const score = typeof rawVal === 'number' && !isNaN(rawVal) ? Number(rawVal) : 0;
      return {
        ...domain,
        score
      };
    });

    const anyScorePositive = scoredList.some(d => d.score > 0);

    // Sorting algorithm:
    // 1. Lowest score first (ascending)
    // 2. Highest blueprint weight first (descending) as tie-breaker (improving high weight domains yields highest overall score gain)
    // 3. Alphabetical tie-breaker
    const sorted = [...scoredList].sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return a.title.localeCompare(b.title);
    });

    const top3 = sorted.slice(0, 3).map((domain, index): FocusDomainItem => {
      const benchmark = 4.0;
      const gap = Math.max(0, Number((benchmark - domain.score).toFixed(1)));
      
      let status: 'critical' | 'needs_work' | 'progressing' | 'unassessed' = 'needs_work';
      if (domain.score === 0) {
        status = 'unassessed';
      } else if (domain.score < 2.5) {
        status = 'critical';
      } else if (domain.score < 3.5) {
        status = 'needs_work';
      } else {
        status = 'progressing';
      }

      let recommendation = '';
      let estimatedMinutes = 25;
      if (index === 0) {
        recommendation = `Priority #1: Dedicate 30 mins to deep dive core frameworks, review operational case examples, and master key calculations/rules in ${domain.title}.`;
        estimatedMinutes = 35;
      } else if (index === 1) {
        recommendation = `Priority #2: Strengthen understanding of key terminology, regulatory standards, and management decision principles.`;
        estimatedMinutes = 25;
      } else {
        recommendation = `Priority #3: Consolidate high-yield concepts and drill scenario-based flashcards to lock in baseline competency.`;
        estimatedMinutes = 20;
      }

      return {
        ...domain,
        priorityRank: index + 1,
        status,
        gapToBenchmark: gap,
        recommendation,
        estimatedMinutes
      };
    });

    const combinedCoverage = top3.reduce((sum, d) => sum + d.weight, 0);

    return {
      top3Domains: top3,
      hasAnyScores: anyScorePositive,
      totalCoveragePercent: combinedCoverage
    };
  }, [domainScores]);

  const weakestDomain = top3Domains[0];

  const handleLaunch = (domain: FocusDomainItem) => {
    if (onLaunchFocusedSession) {
      onLaunchFocusedSession(domain.key, domain.title);
    } else {
      // Launch deep dive focused session with query parameters
      navigate(`/mode/deepdive?domain=${domain.key}&domainTitle=${encodeURIComponent(domain.title)}`);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        label: 'Priority 1 • Weakest Domain',
        bg: 'bg-rose-500 text-white dark:bg-rose-600',
        border: 'border-rose-200 dark:border-rose-900/60',
        ring: 'ring-rose-500/20'
      };
    }
    if (rank === 2) {
      return {
        label: 'Priority 2 • High Impact',
        bg: 'bg-amber-500 text-white dark:bg-amber-600',
        border: 'border-amber-200 dark:border-amber-900/60',
        ring: 'ring-amber-500/20'
      };
    }
    return {
      label: 'Priority 3 • Focus Area',
      bg: 'bg-indigo-600 text-white dark:bg-indigo-500',
      border: 'border-indigo-200 dark:border-indigo-900/60',
      ring: 'ring-indigo-500/20'
    };
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Study Roadmap
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/30">
                Top 3 Priority Domains
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Personalized high-yield study sequence generated from your Firestore assessment scores.
            </p>
          </div>
        </div>

        {/* Global Blueprint Coverage Badge & Export Action */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Export strengths & weaknesses summary"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export Summary</span>
          </button>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exam Blueprint Coverage</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {totalCoveragePercent}% of All Questions
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Unassessed / Zero State Advisory */}
      {!hasAnyScores && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200 flex-1">
            <p className="font-semibold mb-0.5">Baseline Blueprint Mode Active</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              No diagnostic scores recorded yet in Firestore. The roadmap is prioritizing the official ACHE exam's highest-weight domains (Healthcare 15%, Leadership 13%, Finance 12%). Take a diagnostic assessment or launch a focused session to calibrate your scores.
            </p>
          </div>
          <button
            onClick={() => navigate('/mode/diagnostic')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0"
          >
            Start Diagnostic
          </button>
        </div>
      )}

      {/* Prominent Weakest Domain Callout & Action */}
      {weakestDomain && (
        <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-50 via-indigo-50/40 to-white dark:from-rose-950/20 dark:via-indigo-950/20 dark:to-slate-800/60 border-2 border-rose-200/80 dark:border-rose-900/50 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                  <TrendingDown className="w-3.5 h-3.5" /> #1 Weakest Domain
                </span>
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                  {weakestDomain.weight}% Exam Weight
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {weakestDomain.title}
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  ({weakestDomain.score > 0 ? `${weakestDomain.score}/5.0` : 'Unrated (0/5)'})
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                This domain represents your largest readiness gap. Launching a focused session here delivers the highest immediate leverage toward reaching the 4.0/5.0 passing benchmark.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => handleLaunch(weakestDomain)}
                className="group px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-98"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Launch Focused Session</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Roadmap Domain Cards Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {top3Domains.map((domain) => {
          const rankInfo = getRankBadge(domain.priorityRank);
          const Icon = domain.icon;
          const scorePercent = (domain.score / 5) * 100;
          const isPrimary = domain.priorityRank === 1;

          return (
            <div
              key={domain.key}
              className={`flex flex-col rounded-2xl p-5 transition-all duration-200 border ${
                isPrimary
                  ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50 shadow-sm ring-1 ring-rose-500/10'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Card Header & Priority Pill */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${rankInfo.bg}`}>
                  {rankInfo.label}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                  {domain.weight}% Blueprint
                </span>
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPrimary
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    : domain.priorityRank === 2
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {domain.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {domain.shortLabel}
                  </p>
                </div>
              </div>

              {/* Score Meter & Benchmark Gap */}
              <div className="mb-4 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">
                    Current Score:
                  </span>
                  <span className={`font-bold ${
                    domain.score === 0
                      ? 'text-slate-400 dark:text-slate-500'
                      : domain.score < 2.5
                      ? 'text-rose-600 dark:text-rose-400'
                      : domain.score < 3.5
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {domain.score > 0 ? `${domain.score.toFixed(1)} / 5.0` : 'Not Assessed (0/5)'}
                  </span>
                </div>

                {/* Progress bar with 4.0 target line */}
                <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPrimary
                        ? 'bg-rose-500'
                        : domain.priorityRank === 2
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.max(5, scorePercent)}%` }}
                  />
                  {/* Passing mark (80% / 4.0) */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40 dark:bg-white/50"
                    style={{ left: '80%' }}
                    title="Target Benchmark (4.0)"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                  <span>Gap to Benchmark (4.0):</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {domain.gapToBenchmark > 0 ? `-${domain.gapToBenchmark} pts` : 'Proficient'}
                  </span>
                </div>
              </div>

              {/* High-Yield Topics */}
              <div className="mb-4 flex-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5 text-indigo-500" />
                  Key Blueprint Topics:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {domain.keyTopics.slice(0, 3).map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Study Recommendation */}
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 bg-white/60 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                {domain.recommendation}
              </p>

              {/* Action Button */}
              <button
                onClick={() => handleLaunch(domain)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  isPrimary
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isPrimary ? (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch Focused Session</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Focus on {domain.shortLabel.split(' ')[0]}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Roadmap Study Protocol Footer */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Recommended weekly roadmap commitment: <strong>90 mins</strong> across top 3 domains.</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mode/flashcards')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
          >
            Review Flashcards
          </button>
          <span>•</span>
          <button
            onClick={() => navigate('/mode/simulator')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
          >
            Scenario Simulator
          </button>
        </div>
      </div>

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        user={user}
        profile={profile || { domainScores, overallScore }}
      />
    </div>
  );
}
