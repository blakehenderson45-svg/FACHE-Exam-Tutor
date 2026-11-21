import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LOCAL_GUEST_UID, updateLocalProfile } from './localStore';
import { ACHE_DOMAINS, PASSING_BENCHMARK } from '../components/ProgressAnalytics';

export type BadgeCategory = 'streak' | 'domain' | 'milestone';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface BadgeDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: BadgeCategory;
  domainKey?: string;
  tier: BadgeTier;
  iconName: string;
  description: string;
  requirement: string;
  blueprintReference: string;
  examWeight?: number;
}

export interface EvaluatedBadge extends BadgeDefinition {
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  progressPercentage: number;
  unlockedAt?: string;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  hasStudiedToday: boolean;
  totalStudyDays: number;
  lastStudyDate?: string;
  studyDates: string[];
  past7Days: {
    dateStr: string;
    dayLabel: string;
    studied: boolean;
    isToday: boolean;
  }[];
}

// Complete Catalog of ACHE Honors & Milestones
export const ACHE_BADGES: BadgeDefinition[] = [
  // ==================== STREAK BADGES ====================
  {
    id: 'streak-1',
    title: 'Executive Inception',
    subtitle: '1-Day Study Activity',
    category: 'streak',
    tier: 'bronze',
    iconName: 'Flame',
    description: 'Began the executive journey toward ACHE Board of Governors Exam certification.',
    requirement: 'Log at least 1 study session.',
    blueprintReference: 'Habit Formation & Self-Directed Learning'
  },
  {
    id: 'streak-3',
    title: 'Momentum Catalyst',
    subtitle: '3-Day Study Streak',
    category: 'streak',
    tier: 'bronze',
    iconName: 'Zap',
    description: 'Maintained consistent preparation for 3 consecutive days, establishing executive cadence.',
    requirement: 'Study for 3 consecutive days.',
    blueprintReference: 'Spaced Repetition & Cognitive Conditioning'
  },
  {
    id: 'streak-7',
    title: '7-Day Study Streak',
    subtitle: '1 Full Week of Rigor',
    category: 'streak',
    tier: 'silver',
    iconName: 'Award',
    description: 'Demonstrated steadfast discipline by completing examination drills every day for an entire week.',
    requirement: 'Maintain a 7-day consecutive study streak.',
    blueprintReference: 'High-Performance Executive Routine'
  },
  {
    id: 'streak-14',
    title: 'Executive Fortitude',
    subtitle: '14-Day Study Streak',
    category: 'streak',
    tier: 'gold',
    iconName: 'ShieldCheck',
    description: 'Two unbroken weeks of daily exam prep, cementing deep domain retention and exam readiness.',
    requirement: 'Maintain a 14-day consecutive study streak.',
    blueprintReference: 'Advanced Retention & Professional Commitment'
  },
  {
    id: 'streak-30',
    title: 'Fellowship Dedication',
    subtitle: '30-Day Mastery Streak',
    category: 'streak',
    tier: 'platinum',
    iconName: 'Crown',
    description: 'A full month of continuous daily study. Exhibits the perseverance and fortitude expected of an ACHE Fellow.',
    requirement: 'Maintain a 30-day consecutive study streak.',
    blueprintReference: 'Fellow of the American College of Healthcare Executives (FACHE)'
  },

  // ==================== DOMAIN OUTLINE MILESTONES (10 Domains) ====================
  {
    id: 'domain-ManagementAndLeadership',
    title: 'Transformational Leader',
    subtitle: 'Management & Leadership Mastery',
    category: 'domain',
    domainKey: 'ManagementAndLeadership',
    tier: 'gold',
    iconName: 'Users',
    description: 'Attained passing benchmark (3.8+/5) in Management & Leadership, the highest-weighted domain on the ACHE exam.',
    requirement: 'Score ≥ 3.8 in Management & Leadership (17% Blueprint Weight).',
    blueprintReference: 'Area I: Management & Leadership (17%)',
    examWeight: 17
  },
  {
    id: 'domain-Finance',
    title: 'Fiduciary Steward',
    subtitle: 'Healthcare Finance Mastery',
    category: 'domain',
    domainKey: 'Finance',
    tier: 'gold',
    iconName: 'DollarSign',
    description: 'Mastered capital budgeting, revenue cycles, financial statement ratios, and third-party reimbursement models.',
    requirement: 'Score ≥ 3.8 in Healthcare Finance (12% Blueprint Weight).',
    blueprintReference: 'Area III: Healthcare Finance (12%)',
    examWeight: 12
  },
  {
    id: 'domain-QualityAndPerformance',
    title: 'High-Reliability Champion',
    subtitle: 'Quality & PI Mastery',
    category: 'domain',
    domainKey: 'QualityAndPerformance',
    tier: 'gold',
    iconName: 'CheckCircle2',
    description: 'Mastered Lean Six Sigma, PDCA, patient safety culture, clinical outcomes, and accreditation standards.',
    requirement: 'Score ≥ 3.8 in Quality & Performance Improvement (12% Blueprint Weight).',
    blueprintReference: 'Area VI: Quality & Performance Improvement (12%)',
    examWeight: 12
  },
  {
    id: 'domain-Healthcare',
    title: 'Continuum Visionary',
    subtitle: 'Healthcare Environment Mastery',
    category: 'domain',
    domainKey: 'Healthcare',
    tier: 'silver',
    iconName: 'HeartPulse',
    description: 'Mastered the healthcare delivery continuum, public policy shifts, social determinants of health, and epidemiological trends.',
    requirement: 'Score ≥ 3.8 in Healthcare Environment (10% Blueprint Weight).',
    blueprintReference: 'Area II: Healthcare Environment (10%)',
    examWeight: 10
  },
  {
    id: 'domain-Business',
    title: 'Strategic Operator',
    subtitle: 'Business Acumen Mastery',
    category: 'domain',
    domainKey: 'Business',
    tier: 'silver',
    iconName: 'Briefcase',
    description: 'Mastered contract negotiations, market feasibility studies, physician alignment models, and supply chain logistics.',
    requirement: 'Score ≥ 3.8 in Business (10% Blueprint Weight).',
    blueprintReference: 'Area VII: Business (10%)',
    examWeight: 10
  },
  {
    id: 'domain-LawsAndRegulations',
    title: 'Regulatory & Compliance Anchor',
    subtitle: 'Laws & Regulations Mastery',
    category: 'domain',
    domainKey: 'LawsAndRegulations',
    tier: 'silver',
    iconName: 'Scale',
    description: 'Mastered Stark Law, Anti-Kickback Statute, HIPAA, EMTALA, and healthcare antitrust regulations.',
    requirement: 'Score ≥ 3.8 in Laws & Regulations (10% Blueprint Weight).',
    blueprintReference: 'Area V: Laws & Regulations (10%)',
    examWeight: 10
  },
  {
    id: 'domain-HumanResources',
    title: 'People & Culture Strategist',
    subtitle: 'Human Resources Mastery',
    category: 'domain',
    domainKey: 'HumanResources',
    tier: 'silver',
    iconName: 'UserCheck',
    description: 'Mastered clinical talent retention, executive compensation, collective bargaining, and performance evaluation systems.',
    requirement: 'Score ≥ 3.8 in Human Resources (9% Blueprint Weight).',
    blueprintReference: 'Area IV: Human Resources (9%)',
    examWeight: 9
  },
  {
    id: 'domain-HealthcareTechnology',
    title: 'Digital Health Architect',
    subtitle: 'Technology & Health IT Mastery',
    category: 'domain',
    domainKey: 'HealthcareTechnology',
    tier: 'silver',
    iconName: 'Cpu',
    description: 'Mastered EHR optimization, healthcare cybersecurity, interoperability, and digital health transformation.',
    requirement: 'Score ≥ 3.8 in Healthcare Technology & Info Mgmt (8% Blueprint Weight).',
    blueprintReference: 'Area VIII: Healthcare Technology & Information Management (8%)',
    examWeight: 8
  },
  {
    id: 'domain-ProfessionalismAndEthics',
    title: 'Moral Compass & Ethics Guardian',
    subtitle: 'Professionalism & Ethics Mastery',
    category: 'domain',
    domainKey: 'ProfessionalismAndEthics',
    tier: 'silver',
    iconName: 'Compass',
    description: 'Mastered the ACHE Code of Ethics, executive conflicts of interest disclosure, and ethical leadership.',
    requirement: 'Score ≥ 3.8 in Professionalism & Ethics (8% Blueprint Weight).',
    blueprintReference: 'Area IX: Professionalism & Ethics (8%)',
    examWeight: 8
  },
  {
    id: 'domain-Governance',
    title: 'Boardroom Governance Leader',
    subtitle: 'Governance & Structure Mastery',
    category: 'domain',
    domainKey: 'Governance',
    tier: 'bronze',
    iconName: 'Building2',
    description: 'Mastered fiduciary obligations, board committee charters, trustee-CEO relations, and medical staff bylaws.',
    requirement: 'Score ≥ 3.8 in Governance & Organizational Structure (6% Blueprint Weight).',
    blueprintReference: 'Area X: Governance & Organizational Structure (6%)',
    examWeight: 6
  },

  // ==================== EXAM READINESS & DRILL MILESTONES ====================
  {
    id: 'milestone-diagnostic',
    title: 'Diagnostic Pioneer',
    subtitle: 'Baseline Competency Assessed',
    category: 'milestone',
    tier: 'bronze',
    iconName: 'Activity',
    description: 'Completed comprehensive diagnostic evaluation establishing baseline proficiency across all 10 domains.',
    requirement: 'Complete an initial Diagnostic Assessment session or establish baseline domain scores.',
    blueprintReference: 'Pre-Assessment & Gap Identification'
  },
  {
    id: 'milestone-simulator',
    title: 'Scenario Centurion',
    subtitle: 'Mock Examination Drill',
    category: 'milestone',
    tier: 'gold',
    iconName: 'Target',
    description: 'Engaged the Weighted Scenario Simulator to tackle complex situational questions modeled after the actual exam.',
    requirement: 'Complete at least 1 Weighted Scenario Simulator session.',
    blueprintReference: '200-Question Blueprint Scenario Simulation'
  },
  {
    id: 'milestone-flashcards',
    title: 'Rapid-Fire Recaller',
    subtitle: 'Official Flashcard Drill',
    category: 'milestone',
    tier: 'bronze',
    iconName: 'Layers',
    description: 'Drilled official ACHE definitions, formulas, acronyms, and legal precedents using rapid-fire flashcards.',
    requirement: 'Complete at least 1 Rapid-Fire Flashcards session.',
    blueprintReference: 'ACHE 415-Card High-Yield Concept Corpus'
  },
  {
    id: 'milestone-deepdive',
    title: 'Precision Drill Master',
    subtitle: 'Targeted Domain Deep Dive',
    category: 'milestone',
    tier: 'silver',
    iconName: 'Search',
    description: 'Executed focused deep dive sessions to systematically remediate deficit areas in the exam outline.',
    requirement: 'Complete at least 1 targeted Deep Dive study session.',
    blueprintReference: 'Domain Remediation & Precision Study'
  },
  {
    id: 'milestone-trifecta',
    title: 'Executive Trifecta',
    subtitle: '41% Examination Weight Mastery',
    category: 'milestone',
    tier: 'platinum',
    iconName: 'Sparkles',
    description: 'Achieved proficiency (3.8+) across the three highest-weight domains: Management (17%), Finance (12%), and Quality (12%).',
    requirement: 'Attain ≥ 3.8 in Management & Leadership, Healthcare Finance, and Quality.',
    blueprintReference: 'Core Triad (41% Total Exam Weight)'
  },
  {
    id: 'milestone-decathlon',
    title: '10-Domain Scholar',
    subtitle: 'Complete Blueprint Mastery',
    category: 'milestone',
    tier: 'diamond',
    iconName: 'Trophy',
    description: 'Achieved passing proficiency (≥ 3.8/5) across every single one of the 10 official ACHE examination domains.',
    requirement: 'Attain passing proficiency (≥ 3.8/5) across all 10 domains.',
    blueprintReference: '100% Comprehensive Blueprint Coverage'
  },
  {
    id: 'milestone-board-ready',
    title: 'FACHE Board Ready',
    subtitle: 'Composite Passing Status',
    category: 'milestone',
    tier: 'platinum',
    iconName: 'ShieldCheck',
    description: 'Reached an overall composite readiness score of ≥ 3.8/5 (76%+), meeting official ACHE passing standards.',
    requirement: 'Overall Composite Score ≥ 3.8 / 5.0.',
    blueprintReference: 'ACHE Board of Governors Credential Standard'
  }
];

// Helper to format date to YYYY-MM-DD
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calculate streak statistics from user's sessions and profile
export function calculateStreakStats(
  sessions: any[] = [],
  profileStudyDates: string[] = [],
  lastActiveIso?: string
): StreakStats {
  const today = new Date();
  const todayStr = formatDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  // Extract unique study dates from sessions
  const dateSet = new Set<string>();

  // Add dates from sessions
  sessions.forEach((s) => {
    if (s.timestamp) {
      const d = new Date(s.timestamp);
      if (!isNaN(d.getTime())) {
        dateSet.add(formatDateKey(d));
      }
    }
  });

  // Add dates from profile studyDates
  if (Array.isArray(profileStudyDates)) {
    profileStudyDates.forEach((dStr) => {
      if (typeof dStr === 'string' && dStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        dateSet.add(dStr.slice(0, 10));
      }
    });
  }

  // Also include lastActive date if present
  if (lastActiveIso) {
    const d = new Date(lastActiveIso);
    if (!isNaN(d.getTime())) {
      dateSet.add(formatDateKey(d));
    }
  }

  const sortedDates = Array.from(dateSet).sort().reverse();
  const hasStudiedToday = dateSet.has(todayStr);

  // Determine current consecutive streak
  let currentStreak = 0;

  if (hasStudiedToday) {
    currentStreak = 1;
    let checkDate = new Date(today);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevStr = formatDateKey(checkDate);
      if (dateSet.has(prevStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Studied yesterday, so streak is active pending today's study session
    currentStreak = 1;
    let checkDate = new Date(yesterday);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevStr = formatDateKey(checkDate);
      if (dateSet.has(prevStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  // Calculate longest streak across history
  let longestStreak = 0;
  if (sortedDates.length > 0) {
    const ascDates = [...sortedDates].reverse();
    let tempStreak = 1;
    longestStreak = 1;

    for (let i = 1; i < ascDates.length; i++) {
      const prevDate = new Date(ascDates[i - 1]);
      const currDate = new Date(ascDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Generate past 7 days preview (ending today)
  const past7Days = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = formatDateKey(d);
    past7Days.push({
      dateStr: dStr,
      dayLabel: daysOfWeek[d.getDay()],
      studied: dateSet.has(dStr),
      isToday: i === 0
    });
  }

  return {
    currentStreak,
    longestStreak,
    hasStudiedToday,
    totalStudyDays: dateSet.size,
    lastStudyDate: sortedDates[0],
    studyDates: sortedDates,
    past7Days
  };
}

// Evaluate all badges for a user profile and session history
export function evaluateBadges(
  profile: any,
  sessions: any[] = [],
  streakStats: StreakStats
): EvaluatedBadge[] {
  const domainScores: Record<string, number> = profile?.domainScores || {};
  const overallScore = typeof profile?.overallScore === 'number' ? profile.overallScore : 0;
  const storedBadges: string[] = Array.isArray(profile?.badges)
    ? profile.badges
    : typeof profile?.badges === 'object' && profile?.badges !== null
    ? Object.keys(profile.badges)
    : [];

  const storedBadgeSet = new Set<string>(storedBadges);

  // Analyze session modes completed
  const sessionModes = new Set<string>();
  sessions.forEach((s) => {
    if (s.mode) {
      sessionModes.add(s.mode.toLowerCase());
    }
  });

  const hasDiagnostic = sessionModes.has('diagnostic') || overallScore > 0 || Object.values(domainScores).some((s) => s > 0);
  const hasSimulator = sessionModes.has('simulator');
  const hasFlashcards = sessionModes.has('flashcards');
  const hasDeepDive = sessionModes.has('deepdive');

  // Count proficient domains (>= 3.8)
  const proficientDomains = ACHE_DOMAINS.filter((d) => (domainScores[d.key] || 0) >= PASSING_BENCHMARK);

  return ACHE_BADGES.map((badge): EvaluatedBadge => {
    let isUnlocked = storedBadgeSet.has(badge.id);
    let progress = 0;
    let maxProgress = 1;

    switch (badge.id) {
      // Streaks
      case 'streak-1':
        maxProgress = 1;
        progress = Math.min(1, streakStats.totalStudyDays);
        if (streakStats.totalStudyDays >= 1) isUnlocked = true;
        break;

      case 'streak-3':
        maxProgress = 3;
        progress = Math.min(3, Math.max(streakStats.currentStreak, streakStats.longestStreak));
        if (progress >= 3) isUnlocked = true;
        break;

      case 'streak-7':
        maxProgress = 7;
        progress = Math.min(7, Math.max(streakStats.currentStreak, streakStats.longestStreak));
        if (progress >= 7) isUnlocked = true;
        break;

      case 'streak-14':
        maxProgress = 14;
        progress = Math.min(14, Math.max(streakStats.currentStreak, streakStats.longestStreak));
        if (progress >= 14) isUnlocked = true;
        break;

      case 'streak-30':
        maxProgress = 30;
        progress = Math.min(30, Math.max(streakStats.currentStreak, streakStats.longestStreak));
        if (progress >= 30) isUnlocked = true;
        break;

      // Domain outline scores
      case 'domain-ManagementAndLeadership':
      case 'domain-Finance':
      case 'domain-QualityAndPerformance':
      case 'domain-Healthcare':
      case 'domain-Business':
      case 'domain-LawsAndRegulations':
      case 'domain-HumanResources':
      case 'domain-HealthcareTechnology':
      case 'domain-ProfessionalismAndEthics':
      case 'domain-Governance': {
        const domainKey = badge.domainKey!;
        const score = domainScores[domainKey] || 0;
        maxProgress = PASSING_BENCHMARK;
        progress = Math.min(PASSING_BENCHMARK, Number(score.toFixed(1)));
        if (score >= PASSING_BENCHMARK) isUnlocked = true;
        break;
      }

      // Milestones
      case 'milestone-diagnostic':
        maxProgress = 1;
        progress = hasDiagnostic ? 1 : 0;
        if (hasDiagnostic) isUnlocked = true;
        break;

      case 'milestone-simulator':
        maxProgress = 1;
        progress = hasSimulator ? 1 : 0;
        if (hasSimulator) isUnlocked = true;
        break;

      case 'milestone-flashcards':
        maxProgress = 1;
        progress = hasFlashcards ? 1 : 0;
        if (hasFlashcards) isUnlocked = true;
        break;

      case 'milestone-deepdive':
        maxProgress = 1;
        progress = hasDeepDive ? 1 : 0;
        if (hasDeepDive) isUnlocked = true;
        break;

      case 'milestone-trifecta': {
        // Management (17%), Finance (12%), Quality (12%)
        maxProgress = 3;
        let count = 0;
        if ((domainScores['ManagementAndLeadership'] || 0) >= PASSING_BENCHMARK) count++;
        if ((domainScores['Finance'] || 0) >= PASSING_BENCHMARK) count++;
        if ((domainScores['QualityAndPerformance'] || 0) >= PASSING_BENCHMARK) count++;
        progress = count;
        if (count >= 3) isUnlocked = true;
        break;
      }

      case 'milestone-decathlon': {
        maxProgress = 10;
        progress = proficientDomains.length;
        if (proficientDomains.length >= 10) isUnlocked = true;
        break;
      }

      case 'milestone-board-ready': {
        maxProgress = PASSING_BENCHMARK;
        progress = Math.min(PASSING_BENCHMARK, overallScore);
        if (overallScore >= PASSING_BENCHMARK) isUnlocked = true;
        break;
      }

      default:
        break;
    }

    const progressPercentage = Math.min(100, Math.max(0, Math.round((progress / maxProgress) * 100)));

    return {
      ...badge,
      isUnlocked,
      progress,
      maxProgress,
      progressPercentage
    };
  });
}

// Sync unlocked badges and streaks to Firestore if new ones are earned
export async function syncBadgesAndStreak(
  userId: string,
  profile: any,
  sessions: any[] = []
): Promise<{ newBadges: EvaluatedBadge[]; streakStats: StreakStats; evaluatedBadges: EvaluatedBadge[] }> {
  if (!userId) {
    throw new Error('User ID is required to sync badges');
  }

  const streakStats = calculateStreakStats(sessions, profile?.studyDates, profile?.lastActive);
  const evaluatedBadges = evaluateBadges(profile, sessions, streakStats);

  const existingBadgeIds: string[] = Array.isArray(profile?.badges)
    ? profile.badges
    : typeof profile?.badges === 'object' && profile?.badges !== null
    ? Object.keys(profile.badges)
    : [];
  const existingSet = new Set(existingBadgeIds);

  const newlyUnlockedBadges = evaluatedBadges.filter((b) => b.isUnlocked && !existingSet.has(b.id));

  const allUnlockedIds = evaluatedBadges.filter((b) => b.isUnlocked).map((b) => b.id);

  // Check if we need to write updates to Firestore
  const hasNewBadges = newlyUnlockedBadges.length > 0;
  const currentStreakStored = profile?.streak?.currentStreak;
  const longestStreakStored = profile?.streak?.longestStreak;
  const streakChanged =
    currentStreakStored !== streakStats.currentStreak || longestStreakStored !== streakStats.longestStreak;

  if (hasNewBadges || streakChanged || !profile?.badges) {
    const badgePatch = {
      badges: allUnlockedIds,
      streak: {
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        lastStudyDate: streakStats.lastStudyDate || new Date().toISOString()
      },
      studyDates: streakStats.studyDates,
      lastActive: new Date().toISOString()
    };

    if (userId === LOCAL_GUEST_UID) {
      updateLocalProfile(badgePatch);
    } else {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, badgePatch);
      } catch (err) {
        console.error('Failed to sync badges to Firestore:', err);
      }
    }
  }

  return {
    newBadges: newlyUnlockedBadges,
    streakStats,
    evaluatedBadges
  };
}
