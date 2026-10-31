import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Flame,
  Zap,
  ShieldCheck,
  Crown,
  Users,
  DollarSign,
  CheckCircle2,
  HeartPulse,
  Briefcase,
  Scale,
  UserCheck,
  Cpu,
  Compass,
  Building2,
  Activity,
  Target,
  Layers,
  Search,
  Sparkles,
  Trophy,
  Lock,
  ChevronRight,
  X,
  Calendar,
  ArrowRight,
  TrendingUp,
  Info,
  Check,
  PlusCircle
} from 'lucide-react';
import {
  ACHE_BADGES,
  EvaluatedBadge,
  StreakStats,
  BadgeCategory,
  BadgeTier
} from '../services/badgeService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface BadgeSystemProps {
  user: any;
  profile: any;
  streakStats: StreakStats;
  badges: EvaluatedBadge[];
  onProfileUpdated?: (updated: any) => void;
  onNavigateToTab?: (tab: string) => void;
}

// Icon mapper helper
export function renderBadgeIcon(iconName: string, className: string = 'w-6 h-6') {
  switch (iconName) {
    case 'Flame': return <Flame className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Award': return <Award className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Crown': return <Crown className={className} />;
    case 'Users': return <Users className={className} />;
    case 'DollarSign': return <DollarSign className={className} />;
    case 'CheckCircle2': return <CheckCircle2 className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    case 'Scale': return <Scale className={className} />;
    case 'UserCheck': return <UserCheck className={className} />;
    case 'Cpu': return <Cpu className={className} />;
    case 'Compass': return <Compass className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'Activity': return <Activity className={className} />;
    case 'Target': return <Target className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'Search': return <Search className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    default: return <Award className={className} />;
  }
}

// Tier badge visual styling
export function getTierBadgeStyle(tier: BadgeTier, isUnlocked: boolean) {
  if (!isUnlocked) {
    return {
      border: 'border-slate-200 dark:border-slate-800',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
      glow: '',
      pill: 'bg-slate-100 dark:bg-slate-800 text-slate-500'
    };
  }

  switch (tier) {
    case 'bronze':
      return {
        border: 'border-amber-300 dark:border-amber-700/60 shadow-amber-500/10',
        badgeBg: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/20',
        glow: 'ring-1 ring-amber-400/30',
        pill: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
      };
    case 'silver':
      return {
        border: 'border-slate-300 dark:border-slate-600 shadow-slate-500/10',
        badgeBg: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-md shadow-slate-500/20',
        glow: 'ring-1 ring-slate-300 dark:ring-slate-600',
        pill: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
      };
    case 'gold':
      return {
        border: 'border-yellow-400 dark:border-yellow-600/70 shadow-yellow-500/15',
        badgeBg: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-white shadow-md shadow-yellow-500/30',
        glow: 'ring-2 ring-yellow-400/40',
        pill: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800/50'
      };
    case 'platinum':
      return {
        border: 'border-indigo-400 dark:border-indigo-600/70 shadow-indigo-500/20',
        badgeBg: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-white shadow-md shadow-indigo-500/30',
        glow: 'ring-2 ring-indigo-400/50',
        pill: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/50'
      };
    case 'diamond':
      return {
        border: 'border-cyan-300 dark:border-cyan-500/80 shadow-cyan-500/25',
        badgeBg: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/35',
        glow: 'ring-2 ring-cyan-400/60 animate-pulse',
        pill: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60'
      };
  }
}

export default function BadgeSystem({
  user,
  profile,
  streakStats,
  badges,
  onProfileUpdated,
  onNavigateToTab
}: BadgeSystemProps) {
  const navigate = useNavigate();
  const [selectedBadge, setSelectedBadge] = useState<EvaluatedBadge | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | BadgeCategory>('all');
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [loggingStudy, setLoggingStudy] = useState(false);

  // Unlocked summary
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;
  const unlockPercentage = Math.round((unlockedCount / totalCount) * 100);

  // Filter badges
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
      if (onlyUnlocked && !b.isUnlocked) return false;
      return true;
    });
  }, [badges, categoryFilter, onlyUnlocked]);

  // Log study session today manually to support active daily study habits
  const handleLogTodayStudy = async () => {
    if (!user?.uid || loggingStudy) return;
    setLoggingStudy(true);
    try {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const existingDates: string[] = Array.isArray(profile?.studyDates) ? profile.studyDates : [];
      const updatedDates = Array.from(new Set([todayKey, ...existingDates])).sort().reverse();

      const userRef = doc(db, 'users', user.uid);
      const nowIso = new Date().toISOString();

      await updateDoc(userRef, {
        studyDates: updatedDates,
        lastActive: nowIso
      });

      if (onProfileUpdated) {
        onProfileUpdated({
          ...profile,
          studyDates: updatedDates,
          lastActive: nowIso
        });
      }
    } catch (err) {
      console.error('Failed to log study day:', err);
    } finally {
      setLoggingStudy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ================= STREAK HERO CARD ================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-amber-50/40 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 rounded-3xl border border-amber-200/60 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Flame streak info */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/25">
                <Flame className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-white dark:bg-slate-900 rounded-full border border-amber-300 dark:border-amber-600 text-[11px] font-bold text-amber-600 dark:text-amber-400 shadow-xs">
                Active
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                  ACHE Study Cadence
                </span>
                {streakStats.hasStudiedToday && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Studied Today
                  </span>
                )}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 flex items-baseline gap-2">
                {streakStats.currentStreak}{' '}
                <span className="text-xl sm:text-2xl font-bold text-slate-600 dark:text-slate-400">
                  {streakStats.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {streakStats.hasStudiedToday
                  ? "Outstanding! You've logged exam prep today. Your streak is protected."
                  : streakStats.currentStreak > 0
                  ? "Keep the fire burning! Complete a drill today to advance your streak."
                  : 'Start your study streak today with a practice drill or flashcard session!'}
              </p>
            </div>
          </div>

          {/* Past 7-Days Calendar Tracker */}
          <div className="w-full lg:w-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                This Week's Activity
              </span>
              {!streakStats.hasStudiedToday && (
                <button
                  onClick={handleLogTodayStudy}
                  disabled={loggingStudy}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {loggingStudy ? 'Recording...' : 'Mark Studied'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {streakStats.past7Days.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {day.dayLabel}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      day.studied
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm'
                        : day.isToday
                        ? 'border-2 border-dashed border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600'
                    }`}
                    title={`${day.dateStr} - ${day.studied ? 'Studied' : 'Rest'}`}
                  >
                    {day.studied ? (
                      <Flame className="w-4 h-4 fill-white" />
                    ) : day.isToday ? (
                      <span className="text-xs font-bold">Today</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestone stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Longest Streak</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {streakStats.longestStreak} {streakStats.longestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Study Days</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {streakStats.totalStudyDays} days
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Honors Earned</span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {unlockedCount} / {totalCount}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mastery Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${unlockPercentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {unlockPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FILTER & CATEGORY TABS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Honors ({badges.length})
          </button>
          <button
            onClick={() => setCategoryFilter('streak')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'streak'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Study Streaks (5)
          </button>
          <button
            onClick={() => setCategoryFilter('domain')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'domain'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-indigo-500" />
            Domain Milestones (10)
          </button>
          <button
            onClick={() => setCategoryFilter('milestone')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'milestone'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-purple-500" />
            Exam Milestones (7)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={onlyUnlocked}
              onChange={(e) => setOnlyUnlocked(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>Show Unlocked Only ({unlockedCount})</span>
          </label>
        </div>
      </div>

      {/* ================= BADGES GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBadges.map((badge) => {
          const style = getTierBadgeStyle(badge.tier, badge.isUnlocked);

          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 cursor-pointer text-left bg-white dark:bg-slate-900 hover:-translate-y-1 hover:shadow-lg ${
                style.border
              } ${style.glow} ${
                badge.isUnlocked ? 'shadow-xs' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div>
                {/* Header with tier pill and unlocked status */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${style.pill}`}>
                    {badge.tier}
                  </span>

                  {badge.isUnlocked ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Earned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                {/* Badge Insignia & Title */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      style.badgeBg
                    }`}
                  >
                    {renderBadgeIcon(badge.iconName, 'w-6 h-6')}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {badge.subtitle}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {badge.description}
                </p>
              </div>

              {/* Progress and Blueprint tag */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {badge.isUnlocked ? 'Goal Mastered' : 'Progress'}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {badge.isUnlocked
                      ? '100%'
                      : `${badge.progress} / ${badge.maxProgress} (${badge.progressPercentage}%)`}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      badge.isUnlocked
                        ? 'bg-emerald-500'
                        : 'bg-indigo-600 dark:bg-indigo-500'
                    }`}
                    style={{ width: `${badge.progressPercentage}%` }}
                  />
                </div>

                {badge.examWeight && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      Exam Weight: {badge.examWeight}%
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 flex items-center gap-0.5">
                      Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= BADGE DETAILS MODAL ================= */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Emblem in modal */}
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
                  getTierBadgeStyle(selectedBadge.tier, selectedBadge.isUnlocked).badgeBg
                }`}
              >
                {renderBadgeIcon(selectedBadge.iconName, 'w-10 h-10')}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  getTierBadgeStyle(selectedBadge.tier, selectedBadge.isUnlocked).pill
                }`}>
                  {selectedBadge.tier} Tier
                </span>
                {selectedBadge.isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Honor Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {selectedBadge.title}
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedBadge.subtitle}
              </p>
            </div>

            {/* Content Body */}
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  What This Demonstrates
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  ACHE Blueprint Alignment
                </h4>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBadge.blueprintReference}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Requirement: {selectedBadge.requirement}
                </p>
              </div>

              {/* Progress Bar in Modal */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  <span>Current Standing</span>
                  <span>{selectedBadge.progress} / {selectedBadge.maxProgress} ({selectedBadge.progressPercentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      selectedBadge.isUnlocked ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${selectedBadge.progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {selectedBadge.domainKey ? (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    navigate(
                      `/mode/deepdive?domain=${selectedBadge.domainKey}&domainTitle=${encodeURIComponent(
                        selectedBadge.subtitle
                      )}`
                    );
                  }}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  <span>Launch Focused Domain Drill</span>
                </button>
              ) : selectedBadge.category === 'streak' ? (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    navigate('/mode/flashcards');
                  }}
                  className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Flame className="w-4 h-4" />
                  <span>Start Daily Drill (Keep Streak)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    navigate('/mode/simulator');
                  }}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Target className="w-4 h-4" />
                  <span>Launch Exam Simulator</span>
                </button>
              )}

              <button
                onClick={() => setSelectedBadge(null)}
                className="py-3 px-5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Executive Streak & Badges Widget for Dashboard Home
export function ExecutiveHonorsWidget({
  streakStats,
  badges,
  onViewAllBadges
}: {
  streakStats: StreakStats;
  badges: EvaluatedBadge[];
  onViewAllBadges: () => void;
}) {
  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const topBadges = unlockedBadges.slice(0, 4);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Executive Cadence & Honors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily study streak and ACHE outline milestones
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllBadges}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline"
        >
          View All {badges.length} Honors <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-slate-800 dark:to-slate-800/80 border border-amber-200/50 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Study Streak
            </span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'Day' : 'Days'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {streakStats.hasStudiedToday
              ? 'Active today • Streak protected'
              : 'Study today to keep streak active'}
          </p>
        </div>

        {/* Badges unlocked summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800/80 border border-indigo-200/50 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Milestones Earned
            </span>
            <Trophy className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {unlockedBadges.length} / {badges.length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {Math.round((unlockedBadges.length / badges.length) * 100)}% of total exam honors unlocked
          </p>
        </div>

        {/* Longest streak */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Total Study Days
            </span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {streakStats.totalStudyDays} Days
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Longest recorded: {streakStats.longestStreak} days
          </p>
        </div>
      </div>

      {/* Recent Badges Emblem strip */}
      {topBadges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Recent Honors:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {topBadges.map((badge) => (
              <div
                key={badge.id}
                onClick={onViewAllBadges}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-400 transition-colors"
                title={badge.title}
              >
                <div className="text-amber-500">
                  {renderBadgeIcon(badge.iconName, 'w-3.5 h-3.5')}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {badge.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
