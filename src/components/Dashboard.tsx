import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Target,
  Layers,
  Search,
  LogOut,
  Award,
  TrendingUp,
  TrendingDown,
  Trash2,
  BarChart2,
  BookOpen,
  ArrowRight,
  Compass,
  Zap,
  Flame,
  X,
  Download,
  Bookmark
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { logout, db } from '../firebase';
import {
  LOCAL_GUEST_UID,
  getLocalProfile,
  getLocalSessions,
  deleteLocalSession
} from '../services/localStore';
import { getVaultItems, VaultItem } from '../services/vaultService';
import ThemeToggle from './ThemeToggle';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import ProgressAnalytics, { ACHE_DOMAINS } from './ProgressAnalytics';
import StudyRoadmap from './StudyRoadmap';
import BadgeSystem, { ExecutiveHonorsWidget } from './BadgeSystem';
import ExportSummaryModal from './ExportSummaryModal';
import ExecutiveReferenceModal from './ExecutiveReferenceModal';
import MissedVaultModal from './MissedVaultModal';
import {
  calculateStreakStats,
  evaluateBadges,
  syncBadgesAndStreak,
  EvaluatedBadge,
  StreakStats
} from '../services/badgeService';

export type DashboardTab = 'modules' | 'roadmap' | 'analytics' | 'badges';

export default function Dashboard({
  user,
  initialTab = 'modules'
}: {
  user: any;
  initialTab?: DashboardTab;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const validTab: DashboardTab =
    tabFromUrl === 'analytics'
      ? 'analytics'
      : tabFromUrl === 'roadmap'
      ? 'roadmap'
      : tabFromUrl === 'badges'
      ? 'badges'
      : initialTab;
  const [activeTab, setActiveTab] = useState<DashboardTab>(validTab);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [toastBadge, setToastBadge] = useState<EvaluatedBadge | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

  useEffect(() => {
    setVaultItems(getVaultItems(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'analytics') {
      setActiveTab('analytics');
    } else if (tabParam === 'roadmap') {
      setActiveTab('roadmap');
    } else if (tabParam === 'badges') {
      setActiveTab('badges');
    } else if (tabParam === 'modules') {
      setActiveTab('modules');
    }
  }, [searchParams]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'modules' ? {} : { tab });
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      deleteLocalSession(sessionId);
      if (user?.uid !== LOCAL_GUEST_UID && !sessionId.startsWith('local_sess_')) {
        await deleteDoc(doc(db, 'sessions', sessionId));
      }
      setSessions(sessions.filter((s) => s.id !== sessionId));
      setAllSessions(allSessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid === LOCAL_GUEST_UID) {
        setProfile(getLocalProfile());
        return;
      }
      if (user?.uid) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setProfile(userSnap.data());
          } else {
            setProfile(getLocalProfile());
          }
        } catch (err) {
          console.warn('Falling back to local profile:', err);
          setProfile(getLocalProfile());
        }
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchSessions = async () => {
      const populateSessions = (sessionsData: any[]) => {
        sessionsData.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAllSessions(sessionsData);

        const uniqueModes = new Set();
        const filteredSessions = [];
        for (const session of sessionsData) {
          if (!uniqueModes.has(session.mode)) {
            uniqueModes.add(session.mode);
            filteredSessions.push(session);
          }
        }
        setSessions(filteredSessions.slice(0, 5));
      };

      if (user?.uid === LOCAL_GUEST_UID) {
        populateSessions(getLocalSessions());
        return;
      }

      if (user?.uid) {
        const q = query(collection(db, 'sessions'), where('uid', '==', user.uid));
        try {
          const querySnapshot = await getDocs(q);
          const sessionsData = querySnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
          })) as any[];
          populateSessions(sessionsData);
        } catch (error) {
          console.warn('Error fetching Firestore sessions, using local sessions:', error);
          populateSessions(getLocalSessions());
        }
      }
    };
    fetchSessions();
  }, [user]);

  // Real-time calculation of Streak and Badges
  const streakStats: StreakStats = useMemo(() => {
    return calculateStreakStats(allSessions, profile?.studyDates, profile?.lastActive);
  }, [allSessions, profile]);

  const evaluatedBadges: EvaluatedBadge[] = useMemo(() => {
    return evaluateBadges(profile, allSessions, streakStats);
  }, [profile, allSessions, streakStats]);

  // Sync unlocked badges and streak in the background
  useEffect(() => {
    if (user?.uid && profile) {
      syncBadgesAndStreak(user.uid, profile, allSessions)
        .then(({ newBadges }) => {
          if (newBadges.length > 0) {
            setToastBadge(newBadges[0]);
          }
        })
        .catch((err) => {
          console.error('Failed syncing badges:', err);
        });
    }
  }, [user?.uid, profile?.domainScores, profile?.overallScore, allSessions.length]);

  const { strongestDomain, weakestDomain, radarData } = useMemo(() => {
    const rawScores = profile?.domainScores || {};
    const scores = ACHE_DOMAINS.map((d) => ({
      key: d.key,
      domain: d.shortLabel,
      fullTitle: d.title,
      score: typeof rawScores[d.key] === 'number' ? Number(rawScores[d.key]) : 0
    }));

    const assessedScores = scores.filter((s) => s.score > 0);
    if (assessedScores.length === 0) {
      return { strongestDomain: null, weakestDomain: null, radarData: scores };
    }

    const sortedScores = [...assessedScores].sort((a, b) => b.score - a.score);
    return {
      strongestDomain: sortedScores[0],
      weakestDomain: sortedScores[sortedScores.length - 1],
      radarData: scores
    };
  }, [profile]);

  const handleLaunchRemediationDrill = (specificItem?: VaultItem) => {
    if (specificItem) {
      const modeTarget = specificItem.type === 'flashcard' ? 'flashcards' : 'simulator';
      navigate(
        `/mode/${modeTarget}?remediation=true&domainTitle=${encodeURIComponent(
          `${specificItem.domain}: ${specificItem.termOrQuestion.slice(0, 60)}`
        )}`
      );
    } else {
      navigate('/mode/flashcards?remediation=true');
    }
  };

  const modes = [
    {
      id: 'diagnostic',
      title: 'Diagnostic Assessment',
      description: 'Identify knowledge gaps across the 10 domains.',
      icon: Activity,
      color: 'bg-blue-500 dark:bg-blue-600',
      path: '/mode/diagnostic'
    },
    {
      id: 'simulator',
      title: 'Weighted Scenario Simulator',
      description: '200-Question Blueprint mock exam with 1-tap options & pace timer.',
      icon: Target,
      color: 'bg-emerald-500 dark:bg-emerald-600',
      path: '/mode/simulator'
    },
    {
      id: 'flashcards',
      title: 'Rapid-Fire Flashcards',
      description: 'Drill official ACHE 415-card set concepts with auto-saved remediation vault.',
      icon: Layers,
      color: 'bg-amber-500 dark:bg-amber-600',
      path: '/mode/flashcards'
    },
    {
      id: 'deepdive',
      title: 'The Deep Dive',
      description: 'Search and explain complex concepts with grounded sources.',
      icon: Search,
      color: 'bg-purple-500 dark:bg-purple-600',
      path: '/mode/deepdive'
    }
  ];

  const modeTitles: Record<string, string> = {
    Diagnostic: 'Diagnostic Assessment',
    Simulator: 'Weighted Scenario Simulator',
    Flashcards: 'Rapid-Fire Flashcards',
    DeepDive: 'The Deep Dive'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              FACHE Exam Tutor
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsReferenceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
              title="Open ACHE Executive Formula & Regulatory Reference Sheet"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Reference Sheet</span>
            </button>

            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
              title="Open Missed & Flagged Concepts Vault"
            >
              <Bookmark className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden md:inline">Vault</span>
              {vaultItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                  {vaultItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
              title="Export domain strengths and weaknesses for offline review"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Export Review</span>
            </button>
            <ThemeToggle />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden lg:block truncate max-w-[160px]">
              {user.displayName || user.email}
            </span>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {activeTab === 'analytics'
                ? 'Progress Analytics'
                : activeTab === 'roadmap'
                ? 'Personalized Study Roadmap'
                : activeTab === 'badges'
                ? 'Executive Honors & Milestones'
                : 'Executive Study Hub'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              {activeTab === 'analytics'
                ? 'Data visualization dashboard with Recharts tracking domain mastery velocity over time and 10-domain blueprint radar analytics.'
                : activeTab === 'roadmap'
                ? 'Top 3 priority focus areas based on your lowest scores with focused session launcher.'
                : activeTab === 'badges'
                ? 'Study streak tracking, daily habits, and competency milestone awards across the 10 exam domains.'
                : 'Select an official prep mode, review your missed-concept vault, or follow your personalized roadmap.'}
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-slate-200/70 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-xs flex-wrap gap-1">
            <button
              onClick={() => handleTabChange('modules')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'modules'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Study Modules</span>
            </button>
            <button
              onClick={() => handleTabChange('roadmap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'roadmap'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Study Roadmap</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                Top 3 Focus
              </span>
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Progress Analytics</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                10 Domains
              </span>
            </button>
            <button
              onClick={() => handleTabChange('badges')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'badges'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Honors & Streaks</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                {streakStats.currentStreak > 0
                  ? `${streakStats.currentStreak}d`
                  : `${evaluatedBadges.filter((b) => b.isUnlocked).length} Earned`}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <ProgressAnalytics
            user={user}
            profile={profile}
            sessions={allSessions}
            onProfileUpdated={(updated) => setProfile(updated)}
            onNavigateToMode={(modePath) => navigate(modePath)}
          />
        ) : activeTab === 'roadmap' ? (
          <div className="space-y-8">
            <StudyRoadmap
              domainScores={profile?.domainScores}
              overallScore={profile?.overallScore}
              profile={profile}
              user={user}
            />
          </div>
        ) : activeTab === 'badges' ? (
          <div className="space-y-8">
            <BadgeSystem
              user={user}
              profile={profile}
              streakStats={streakStats}
              badges={evaluatedBadges}
              onProfileUpdated={(updated) => setProfile(updated)}
              onNavigateToTab={(tab) => handleTabChange(tab as DashboardTab)}
            />
          </div>
        ) : (
          <>
            {/* Executive Streaks & Honors Quick Summary Widget */}
            <div className="mb-8">
              <ExecutiveHonorsWidget
                streakStats={streakStats}
                badges={evaluatedBadges}
                onViewAllBadges={() => handleTabChange('badges')}
              />
            </div>

            {/* Missed & Flagged Remediation Vault Quick Banner */}
            {vaultItems.length > 0 && (
              <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-white to-indigo-50/40 dark:from-rose-950/30 dark:via-slate-900 dark:to-indigo-950/20 border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        Missed & Flagged Concepts Vault
                      </h3>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        {vaultItems.length} Needs Review
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                      Latest saved:{' '}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {vaultItems[0].termOrQuestion.slice(0, 75)}
                        {vaultItems[0].termOrQuestion.length > 75 ? '...' : ''}
                      </strong>{' '}
                      ({vaultItems[0].domain})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsVaultModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    Inspect Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLaunchRemediationDrill()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Drill Missed Concepts</span>
                  </button>
                </div>
              </div>
            )}

            {profile && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Readiness Overview
                      </h3>
                      <button
                        onClick={() => handleTabChange('analytics')}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Detailed Analytics <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
                          <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                            Overall Score
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {profile.overallScore > 0
                              ? `${profile.overallScore} / 5`
                              : 'Not Assessed'}
                          </p>
                        </div>
                      </div>

                      {strongestDomain && (
                        <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
                              Strongest Area
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {strongestDomain.fullTitle}{' '}
                              <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                                ({strongestDomain.score}/5)
                              </span>
                            </p>
                          </div>
                        </div>
                      )}

                      {weakestDomain && (
                        <div className="flex items-center gap-4 bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-100 dark:border-rose-500/20">
                          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium tracking-wide">
                              Weakest Area (Priority 1)
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {weakestDomain.fullTitle}{' '}
                              <span className="text-rose-600 dark:text-rose-400 ml-1">
                                ({weakestDomain.score}/5)
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              navigate(
                                `/mode/deepdive?domain=${
                                  weakestDomain.key
                                }&domainTitle=${encodeURIComponent(weakestDomain.fullTitle)}`
                              )
                            }
                            className="px-3 py-1.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Launch Drill</span>
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => handleTabChange('roadmap')}
                          className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-rose-200/50 dark:border-rose-500/30"
                        >
                          <Compass className="w-4 h-4" />
                          <span>View Study Roadmap</span>
                        </button>
                        <button
                          onClick={() => handleTabChange('analytics')}
                          className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-200/50 dark:border-indigo-500/30"
                        >
                          <BarChart2 className="w-4 h-4" />
                          <span>10-Domain Radar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {radarData.length > 0 && (
                    <div className="flex-1 w-full min-h-[300px] h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" />
                          <PolarAngleAxis
                            dataKey="domain"
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                          />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#64748b' }} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.4}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Featured Study Roadmap Section */}
            <div className="mb-10">
              <StudyRoadmap
                domainScores={profile?.domainScores}
                overallScore={profile?.overallScore}
              />
            </div>

            {profile &&
              Array.isArray(profile.strengths) &&
              profile.strengths.length > 0 &&
              Array.isArray(profile.weaknesses) &&
              profile.weaknesses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" /> Your Strengths
                    </h3>
                    <ul className="space-y-2">
                      {profile.strengths.map((strength: string, idx: number) => (
                        <li
                          key={idx}
                          className="text-slate-700 dark:text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" /> Areas to Study
                    </h3>
                    <ul className="space-y-2">
                      {profile.weaknesses.map((weakness: string, idx: number) => (
                        <li
                          key={idx}
                          className="text-slate-700 dark:text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => navigate(mode.path)}
                  className="group flex flex-col items-start p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all duration-300 text-left transform hover:-translate-y-1"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md ${mode.color}`}
                  >
                    <mode.icon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mode.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Recent Sessions
              </h2>
              {sessions.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  {sessions.map((session, index) => (
                    <div
                      key={session.id}
                      className={`p-5 flex items-center justify-between ${
                        index !== sessions.length - 1
                          ? 'border-b border-slate-100 dark:border-slate-800'
                          : ''
                      }`}
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {modeTitles[session.mode] || session.mode}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(session.timestamp).toLocaleDateString()} at{' '}
                          {new Date(session.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/session/${session.id}`)}
                          className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                          Resume <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-slate-500 dark:text-slate-400">
                    No recent sessions found. Start a study mode to see your history here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Celebratory Honor Unlocked Toast */}
      {toastBadge && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl border border-amber-400/60 dark:border-amber-500/80 flex items-start gap-3 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 text-white shadow-md shadow-amber-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400 dark:text-amber-600">
                Honor Unlocked!
              </span>
              <button
                onClick={() => setToastBadge(null)}
                className="text-slate-400 hover:text-white dark:hover:text-slate-900 p-0.5 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="font-bold text-sm mt-0.5 leading-snug">{toastBadge.title}</h4>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5 line-clamp-2">
              {toastBadge.subtitle}
            </p>
            <button
              onClick={() => {
                setToastBadge(null);
                handleTabChange('badges');
              }}
              className="mt-2 text-xs font-bold text-amber-400 dark:text-amber-600 hover:underline flex items-center gap-1"
            >
              <span>View in Honors Showcase</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        user={user}
        profile={profile}
      />

      {/* Searchable Executive Reference & Formula Sheet Modal */}
      <ExecutiveReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        onSelectForDeepDive={(topicTitle) =>
          navigate(`/mode/deepdive?domainTitle=${encodeURIComponent(topicTitle)}`)
        }
      />

      {/* Missed & Flagged Concepts Remediation Vault Modal */}
      <MissedVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        items={vaultItems}
        uid={user?.uid}
        onItemsChanged={(updated) => setVaultItems(updated)}
        onLaunchRemediationDrill={handleLaunchRemediationDrill}
      />
    </div>
  );
}
