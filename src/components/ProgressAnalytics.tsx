import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Building2,
  Cpu,
  Briefcase,
  Users,
  UserCheck,
  DollarSign,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Zap,
  Info,
  Download,
  FileText
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LOCAL_GUEST_UID, updateLocalProfile } from '../services/localStore';
import DomainMasteryOverTime from './DomainMasteryOverTime';
import ExportSummaryModal from './ExportSummaryModal';

export interface DomainMetadata {
  key: string;
  title: string;
  shortLabel: string;
  weight: number; // percentage of ACHE Board of Governors Exam
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keyTopics: string[];
}

export const ACHE_DOMAINS: DomainMetadata[] = [
  {
    key: 'Healthcare',
    title: 'Healthcare Environment',
    shortLabel: 'Healthcare (15%)',
    weight: 15,
    description: 'Healthcare delivery models, public health trends, epidemiology, health policy, and the healthcare continuum.',
    icon: Activity,
    keyTopics: ['Delivery systems', 'Health policy & reform', 'Epidemiology', 'Continuum of care']
  },
  {
    key: 'ManagementAndLeadership',
    title: 'Management & Leadership',
    shortLabel: 'Leadership (13%)',
    weight: 13,
    description: 'Strategic leadership, organizational culture, change management, operational planning, and executive decision-making.',
    icon: Users,
    keyTopics: ['Strategic leadership', 'Change management', 'Organizational culture', 'Operations planning']
  },
  {
    key: 'Finance',
    title: 'Finance & Reimbursement',
    shortLabel: 'Finance (12%)',
    weight: 12,
    description: 'Capital budgeting, financial statement analysis, reimbursement mechanisms, cost accounting, and revenue cycle management.',
    icon: DollarSign,
    keyTopics: ['Capital budgeting', 'Reimbursement models', 'Financial statement analysis', 'Revenue cycle']
  },
  {
    key: 'HumanResources',
    title: 'Human Resources',
    shortLabel: 'Human Res. (12%)',
    weight: 12,
    description: 'Labor relations, staffing models, retention, credentialing, compensation, and performance management systems.',
    icon: UserCheck,
    keyTopics: ['Labor relations', 'Staff retention & recruitment', 'Credentialing & privileging', 'Performance appraisals']
  },
  {
    key: 'LawsAndRegulations',
    title: 'Laws & Regulations',
    shortLabel: 'Laws/Regs (9%)',
    weight: 9,
    description: 'Healthcare compliance, Stark Law, Anti-Kickback Statute, HIPAA, EMTALA, Joint Commission standards, and risk mitigation.',
    icon: ShieldCheck,
    keyTopics: ['Stark & Anti-Kickback', 'HIPAA & privacy', 'EMTALA & consent', 'Accreditation standards']
  },
  {
    key: 'QualityAndPerformance',
    title: 'Quality & Performance',
    shortLabel: 'Quality/PI (9%)',
    weight: 9,
    description: 'Lean Six Sigma, PDCA cycles, patient safety, clinical quality metrics, HCAHPS scores, and continuous improvement.',
    icon: Award,
    keyTopics: ['Lean Six Sigma & PDCA', 'Patient safety metrics', 'HCAHPS & patient experience', 'Clinical outcomes']
  },
  {
    key: 'Business',
    title: 'Business Principles',
    shortLabel: 'Business (8%)',
    weight: 8,
    description: 'Strategic positioning, contract negotiations, market analysis, supply chain management, and physician alignment.',
    icon: Briefcase,
    keyTopics: ['Market analysis', 'Contract negotiation', 'Supply chain efficiency', 'Physician alignment']
  },
  {
    key: 'HealthcareTechnology',
    title: 'Healthcare Technology & IT',
    shortLabel: 'Health IT (8%)',
    weight: 8,
    description: 'EHR systems, clinical decision support, cybersecurity, health data interoperability, and digital health transformation.',
    icon: Cpu,
    keyTopics: ['EHR optimization', 'Cybersecurity & HIPAA Security', 'Interoperability', 'Clinical decision support']
  },
  {
    key: 'ProfessionalismAndEthics',
    title: 'Professionalism & Ethics',
    shortLabel: 'Ethics (8%)',
    weight: 8,
    description: 'ACHE Code of Ethics, executive conflicts of interest, bioethics, DEI, community accountability, and leadership integrity.',
    icon: Scale,
    keyTopics: ['ACHE Code of Ethics', 'Conflicts of interest', 'Bioethics & clinical ethics', 'DEI & community stewardship']
  },
  {
    key: 'Governance',
    title: 'Governance & Org Structure',
    shortLabel: 'Governance (6%)',
    weight: 6,
    description: 'Fiduciary duties, board-executive dynamics, medical staff relationships, bylaws, and committee oversight.',
    icon: Building2,
    keyTopics: ['Fiduciary obligations', 'Medical staff bylaws', 'Board committees', 'Trustee-CEO relations']
  }
];

export const PASSING_BENCHMARK = 3.8; // Passing score threshold on 1-5 scale (approx 76%)

interface ProgressAnalyticsProps {
  user: any;
  profile: any;
  sessions?: any[];
  onProfileUpdated?: (updated: any) => void;
  onNavigateToMode?: (modePath: string) => void;
}

export default function ProgressAnalytics({
  user,
  profile,
  sessions = [],
  onProfileUpdated,
  onNavigateToMode
}: ProgressAnalyticsProps) {
  const navigate = useNavigate();
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'both' | 'trajectory' | 'radar'>('both');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'needsFocus' | 'proficient'>('all');
  const [sortBy, setSortBy] = useState<'weight' | 'scoreAsc' | 'scoreDesc' | 'alpha'>('weight');
  const [updating, setUpdating] = useState(false);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [tempScore, setTempScore] = useState<number>(3);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Extract current scores for all 10 domains with fallback to 0
  const domainScoresMap: Record<string, number> = useMemo(() => {
    const raw = profile?.domainScores || {};
    const result: Record<string, number> = {};
    ACHE_DOMAINS.forEach((d) => {
      result[d.key] = typeof raw[d.key] === 'number' ? Number(raw[d.key]) : 0;
    });
    return result;
  }, [profile]);

  // Check if user has zero scores across all domains
  const hasScores = useMemo(() => {
    return Object.values(domainScoresMap).some((s) => s > 0);
  }, [domainScoresMap]);

  // Compute weighted composite score and metrics
  const analyticsData = useMemo(() => {
    let totalWeightedScore = 0;
    let assessedCount = 0;
    const items = ACHE_DOMAINS.map((domain) => {
      const score = domainScoresMap[domain.key] || 0;
      if (score > 0) assessedCount++;
      totalWeightedScore += (score * domain.weight) / 100;
      
      const gap = score > 0 ? score - PASSING_BENCHMARK : -PASSING_BENCHMARK;
      // High-leverage gap priority: (Passing - score) * weight
      const priorityDeficit = Math.max(0, PASSING_BENCHMARK - score) * domain.weight;

      return {
        ...domain,
        score,
        benchmark: PASSING_BENCHMARK,
        gap,
        priorityDeficit,
        isProficient: score >= PASSING_BENCHMARK,
        isAssessed: score > 0
      };
    });

    const assessedItems = items.filter((i) => i.score > 0);
    const sortedByScore = [...assessedItems].sort((a, b) => b.score - a.score);

    const strongest = sortedByScore.length > 0 ? sortedByScore[0] : null;
    const weakest = sortedByScore.length > 0 ? sortedByScore[sortedByScore.length - 1] : null;

    // Highest priority opportunity: highest priorityDeficit among all domains
    const highestPriority = [...items].sort((a, b) => b.priorityDeficit - a.priorityDeficit)[0];

    const compositeScore = Number(totalWeightedScore.toFixed(2));
    const passPercentage = Math.round((compositeScore / 5) * 100);

    return {
      items,
      assessedCount,
      compositeScore,
      passPercentage,
      strongest,
      weakest,
      highestPriority
    };
  }, [domainScoresMap]);

  // Radar chart data formatted for Recharts
  const radarChartData = useMemo(() => {
    return ACHE_DOMAINS.map((domain) => {
      const score = domainScoresMap[domain.key] || 0;
      return {
        domainKey: domain.key,
        name: domain.shortLabel,
        fullName: domain.title,
        weight: domain.weight,
        score: score,
        benchmark: PASSING_BENCHMARK
      };
    });
  }, [domainScoresMap]);

  // Filter and sort domain list for breakdown section
  const processedDomains = useMemo(() => {
    let list = [...analyticsData.items];

    if (filterMode === 'needsFocus') {
      list = list.filter((i) => i.score < PASSING_BENCHMARK);
    } else if (filterMode === 'proficient') {
      list = list.filter((i) => i.score >= PASSING_BENCHMARK);
    }

    if (sortBy === 'weight') {
      list.sort((a, b) => b.weight - a.weight);
    } else if (sortBy === 'scoreAsc') {
      list.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'scoreDesc') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [analyticsData.items, filterMode, sortBy]);

  // Helper to load sample diagnostic baseline scores for preview/testing
  const handleLoadSampleScores = async () => {
    if (!user?.uid) return;
    setUpdating(true);
    try {
      const sampleScores: Record<string, number> = {
        Healthcare: 4.2,
        ManagementAndLeadership: 4.0,
        Finance: 2.8,
        HumanResources: 3.5,
        LawsAndRegulations: 3.2,
        QualityAndPerformance: 4.5,
        Business: 3.6,
        HealthcareTechnology: 3.1,
        ProfessionalismAndEthics: 4.8,
        Governance: 3.9
      };

      // Compute overall score
      let weighted = 0;
      ACHE_DOMAINS.forEach((d) => {
        weighted += (sampleScores[d.key] * d.weight) / 100;
      });
      const overall = Number(weighted.toFixed(1));

      const strengths = [
        'Professionalism & Ethics (4.8/5) - High mastery of ACHE Code of Ethics and executive conflicts.',
        'Quality & Performance (4.5/5) - Strong command of Lean Six Sigma and patient safety metrics.',
        'Healthcare Environment (4.2/5) - Proficient in delivery continuum and policy trends.'
      ];
      const weaknesses = [
        'Finance & Reimbursement (2.8/5) - Focus on capital budgeting, financial ratios, and revenue cycle.',
        'Healthcare Technology (3.1/5) - Review EHR interoperability and cybersecurity standards.',
        'Laws & Regulations (3.2/5) - Strengthen Stark Law and Anti-Kickback safe harbors.'
      ];

      const patch = {
        domainScores: sampleScores,
        overallScore: overall,
        strengths,
        weaknesses,
        lastActive: new Date().toISOString()
      };
      updateLocalProfile(patch);
      if (user.uid !== LOCAL_GUEST_UID) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, patch);
      }

      if (onProfileUpdated) {
        onProfileUpdated({
          ...profile,
          domainScores: sampleScores,
          overallScore: overall,
          strengths,
          weaknesses
        });
      }
    } catch (err) {
      console.error('Error setting sample scores:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Helper to update individual domain score
  const handleSaveDomainScore = async (domainKey: string, newScore: number) => {
    if (!user?.uid) return;
    setUpdating(true);
    try {
      const updatedScores = {
        ...domainScoresMap,
        [domainKey]: newScore
      };

      // Recompute overall
      let weighted = 0;
      ACHE_DOMAINS.forEach((d) => {
        weighted += ((updatedScores[d.key] || 0) * d.weight) / 100;
      });
      const overall = Number(weighted.toFixed(1));

      const userRef = doc(db, 'users', user.uid);
      const existingHistory = Array.isArray(profile?.domainHistory) ? profile.domainHistory : [];
      const newSnapshot = {
        timestamp: new Date().toISOString(),
        dateLabel: 'Today',
        sessionMode: `Score Adjusted (${ACHE_DOMAINS.find(d => d.key === domainKey)?.shortLabel || domainKey})`,
        compositeScore: overall,
        scores: updatedScores
      };
      const updatedHistory = [...existingHistory, newSnapshot].slice(-15);

      const scorePatch = {
        domainScores: updatedScores,
        overallScore: overall,
        domainHistory: updatedHistory,
        lastActive: new Date().toISOString()
      };
      updateLocalProfile(scorePatch);
      if (user.uid !== LOCAL_GUEST_UID) {
        await updateDoc(userRef, scorePatch);
      }

      if (onProfileUpdated) {
        onProfileUpdated({
          ...profile,
          domainScores: updatedScores,
          overallScore: overall,
          domainHistory: updatedHistory
        });
      }
      setEditingDomain(null);
    } catch (err) {
      console.error('Error updating domain score:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Status tier styling helper
  const getProficiencyBadge = (score: number) => {
    if (score === 0) {
      return {
        label: 'Unassessed',
        bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        color: 'text-slate-500'
      };
    }
    if (score >= 4.5) {
      return {
        label: 'Mastery (4.5+)',
        bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
        color: 'text-emerald-600 dark:text-emerald-400'
      };
    }
    if (score >= PASSING_BENCHMARK) {
      return {
        label: 'Proficient (Passing)',
        bg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
        color: 'text-teal-600 dark:text-teal-400'
      };
    }
    if (score >= 3.0) {
      return {
        label: 'Borderline Competent',
        bg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
        color: 'text-indigo-600 dark:text-indigo-400'
      };
    }
    return {
      label: 'Needs Priority Study',
      bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      color: 'text-amber-600 dark:text-amber-400'
    };
  };

  const readinessStatus = useMemo(() => {
    const score = analyticsData.compositeScore;
    if (score >= 4.2) {
      return {
        title: 'High Examination Readiness',
        desc: 'Proficiency across core domains comfortably exceeds the Board of Governors benchmark.',
        color: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-500/30'
      };
    }
    if (score >= PASSING_BENCHMARK) {
      return {
        title: 'On Track (Passing Range)',
        desc: 'Solid foundation meeting passing standards. Target your lowest weighted domain for security.',
        color: 'text-teal-600 dark:text-teal-400',
        badge: 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300',
        border: 'border-teal-500/30'
      };
    }
    if (score >= 2.5) {
      return {
        title: 'Targeted Review Needed',
        desc: 'Good progress, but key domains fall below the 3.8/5.0 passing target threshold.',
        color: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300',
        border: 'border-amber-500/30'
      };
    }
    return {
      title: 'Foundational Stage',
      desc: 'Complete the Diagnostic Assessment to populate comprehensive baseline scores across all 10 domains.',
      color: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-500/30'
    };
  }, [analyticsData.compositeScore]);

  // Navigate to Deep Dive targeting domain
  const handleDeepDiveDomain = (domainTitle: string) => {
    if (onNavigateToMode) {
      onNavigateToMode('/mode/deepdive');
    } else {
      navigate('/mode/deepdive');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Callout if unassessed */}
      {!hasScores && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Baseline Diagnostic Required
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Map Your Proficiency Across All 10 ACHE Exam Domains
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Take the AI Diagnostic Assessment to benchmark your healthcare executive competencies against official ACHE Board of Governors exam weighting, or load sample baseline scores to preview the interactive radar analytics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate('/mode/diagnostic')}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              Start Diagnostic <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLoadSampleScores}
              disabled={updating}
              className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              Load Sample Scores
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Export Summary
            </button>
          </div>
        </div>
      )}

      {/* Offline Review & Export Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 rounded-2xl p-4 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Offline Strengths &amp; Weaknesses Review
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                PDF / Text
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Export an executive diagnostic report with domain scores, gap analysis, and offline study checklists.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Offline Summary
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Weighted Composite Index */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ACHE Weighted Index
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {analyticsData.compositeScore > 0 ? analyticsData.compositeScore.toFixed(2) : '—'}
            </span>
            <span className="text-slate-400 text-sm font-medium">/ 5.0</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {analyticsData.passPercentage}%
            </span>{' '}
            overall competency rating
          </p>
        </div>

        {/* Readiness Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Exam Benchmark
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {readinessStatus.title}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            Target benchmark: <span className="font-semibold text-slate-700 dark:text-slate-300">3.8 / 5.0</span>
          </p>
        </div>

        {/* Strongest Domain */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Peak Competency
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {analyticsData.strongest ? analyticsData.strongest.title : 'Pending Assessment'}
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {analyticsData.strongest ? `${analyticsData.strongest.score} / 5 (${analyticsData.strongest.weight}% exam weight)` : '—'}
          </p>
        </div>

        {/* Highest Priority Need */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Highest Leverage Focus
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {analyticsData.highestPriority ? analyticsData.highestPriority.title : 'None identified'}
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            {analyticsData.highestPriority && analyticsData.highestPriority.score > 0
              ? `${analyticsData.highestPriority.score} / 5 (${analyticsData.highestPriority.weight}% weight)`
              : 'Weight: ' + (analyticsData.highestPriority?.weight || 0) + '%'}
          </p>
        </div>
      </div>

      {/* Visualization View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Analytics Visualizations:
          </span>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1">
          <button
            onClick={() => setAnalyticsViewMode('both')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              analyticsViewMode === 'both'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Visualizations
          </button>
          <button
            onClick={() => setAnalyticsViewMode('trajectory')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              analyticsViewMode === 'trajectory'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mastery Over Time (Trend)
          </button>
          <button
            onClick={() => setAnalyticsViewMode('radar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              analyticsViewMode === 'radar'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            10-Domain Radar
          </button>
        </div>
      </div>

      {/* Chronological Mastery Over Time Dashboard (Recharts Line/Area/Bar) */}
      {(analyticsViewMode === 'both' || analyticsViewMode === 'trajectory') && (
        <DomainMasteryOverTime
          user={user}
          profile={profile}
          sessions={sessions}
          onProfileUpdated={onProfileUpdated}
        />
      )}

      {/* Main Radar Chart Visualization Section */}
      {(analyticsViewMode === 'both' || analyticsViewMode === 'radar') && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                10-Domain Competency Radar
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                Official Blueprint
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Visualizing proficiency (1.0 - 5.0) against the ACHE Board of Governors Exam weighted blueprint.
            </p>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowBenchmark(!showBenchmark)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                showBenchmark
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              {showBenchmark ? 'Passing Target: ON (3.8)' : 'Passing Target: OFF'}
            </button>

            {hasScores && (
              <button
                onClick={handleLoadSampleScores}
                disabled={updating}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                title="Reset sample benchmark values"
              >
                Reset Scores
              </button>
            )}
          </div>
        </div>

        {/* Radar Chart Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
          <div className="lg:col-span-8 w-full h-[380px] sm:h-[460px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="72%"
                data={radarChartData}
              >
                <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{
                    fill: '#64748b',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />
                <PolarRadiusAxis
                  angle={18}
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />

                {/* Target Passing Threshold Overlay (3.8) */}
                {showBenchmark && (
                  <Radar
                    name="Passing Target (3.8)"
                    dataKey="benchmark"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="#10b981"
                    fillOpacity={0.08}
                  />
                )}

                {/* User Score Radar */}
                <Radar
                  name="Your Proficiency"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="#6366f1"
                  fillOpacity={0.35}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const score = Number(data.score);
                      const isPassing = score >= PASSING_BENCHMARK;
                      return (
                        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md max-w-xs">
                          <p className="font-bold text-sm text-indigo-300">{data.fullName}</p>
                          <div className="flex items-center justify-between gap-4 pt-1">
                            <span className="text-slate-400">Exam Weight:</span>
                            <span className="font-semibold text-slate-200">{data.weight}% of BOG Exam</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">Your Score:</span>
                            <span className="font-bold text-indigo-400 text-sm">
                              {score > 0 ? `${score} / 5.0` : 'Not Assessed'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">Passing Benchmark:</span>
                            <span className="font-semibold text-emerald-400">{PASSING_BENCHMARK} / 5.0</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 text-[11px]">
                            {score === 0 ? (
                              <span className="text-slate-400">Complete assessment to test this domain</span>
                            ) : isPassing ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Exceeds Passing Threshold (+{(score - PASSING_BENCHMARK).toFixed(1)})
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Deficit: {(PASSING_BENCHMARK - score).toFixed(1)} below passing target
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Legend & High-Level Insights Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Domain Score Scale
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Mastery (Expert)
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">4.5 – 5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    Proficient (Passing)
                  </span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">3.8 – 4.4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    Borderline Competent
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">3.0 – 3.7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Developing (Needs Review)
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">1.0 – 2.9</span>
                </div>
              </div>
            </div>

            {/* Strategic Coaching Note */}
            <div className="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wide">
                <Info className="w-4 h-4" />
                Executive Strategy Note
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                The top 4 domains (<span className="font-semibold text-slate-900 dark:text-white">Healthcare, Leadership, Finance, and HR</span>) account for <span className="font-semibold text-indigo-600 dark:text-indigo-400">52%</span> of all exam questions. High proficiency in these 4 domains significantly stabilizes your overall score.
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* AI Strengths & Weaknesses (if present in profile) */}
      {profile?.strengths && profile?.weaknesses && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Stored Assessment Strengths
              </h3>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                title="Export strengths report"
              >
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
            <ul className="space-y-2">
              {profile.strengths.map((str: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Recommended Remediation Areas
              </h3>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                title="Export remediation report"
              >
                <Download className="w-3.5 h-3.5" /> Export Remediation
              </button>
            </div>
            <ul className="space-y-2">
              {profile.weaknesses.map((wk: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Detailed 10-Domain Breakdown & Actions Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Domain-by-Domain Proficiency Breakdown
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drill down into each domain, adjust scores, or trigger targeted deep dive practice.
            </p>
          </div>

          {/* Filter & Sort controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-medium">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All (10)
              </button>
              <button
                onClick={() => setFilterMode('needsFocus')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'needsFocus'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Needs Focus (&lt;3.8)
              </button>
              <button
                onClick={() => setFilterMode('proficient')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterMode === 'proficient'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Proficient (≥3.8)
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="weight">Sort: Exam Weight</option>
              <option value="scoreAsc">Sort: Lowest Score First</option>
              <option value="scoreDesc">Sort: Highest Score First</option>
              <option value="alpha">Sort: Alphabetical</option>
            </select>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
              title="Export report as PDF or Text"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 10 Domains Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedDomains.map((domain) => {
            const Icon = domain.icon;
            const badge = getProficiencyBadge(domain.score);
            const scorePercentage = Math.min(100, (domain.score / 5) * 100);
            const isEditing = editingDomain === domain.key;

            return (
              <div
                key={domain.key}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Icon, title, weight badge, status badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {domain.title}
                        </h4>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {domain.weight}% Exam Weight
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {domain.description}
                  </p>

                  {/* Score bar & Numeric value */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500 dark:text-slate-400">Current Score:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${badge.color}`}>
                          {domain.score > 0 ? domain.score.toFixed(1) : 'Not Assessed'}
                        </span>
                        <span className="text-slate-400 text-xs">/ 5.0</span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                      {/* Passing indicator tick at 76% (3.8/5) */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/70 z-10"
                        style={{ left: `${(PASSING_BENCHMARK / 5) * 100}%` }}
                        title="3.8 Passing Target"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          domain.score >= PASSING_BENCHMARK
                            ? 'bg-emerald-500'
                            : domain.score >= 3.0
                            ? 'bg-indigo-500'
                            : domain.score > 0
                            ? 'bg-amber-500'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${scorePercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline Score Editor */}
                  {isEditing && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl mb-4 space-y-2 border border-slate-200 dark:border-slate-700 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Set Diagnostic Score (1.0 - 5.0):
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {tempScore.toFixed(1)} / 5
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.1"
                        value={tempScore}
                        onChange={(e) => setTempScore(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingDomain(null)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveDomainScore(domain.key, tempScore)}
                          disabled={updating}
                          className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Key Exam Topics tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {domain.keyTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingDomain(domain.key);
                      setTempScore(domain.score > 0 ? domain.score : 3.0);
                    }}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Adjust Score
                  </button>

                  <button
                    onClick={() => handleDeepDiveDomain(domain.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
                  >
                    Deep Dive
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        user={user}
        profile={profile}
      />
    </div>
  );
}
