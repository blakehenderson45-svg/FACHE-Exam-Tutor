export const LOCAL_GUEST_UID = 'local-executive-guest';
const LOCAL_AUTH_KEY = 'fache_local_guest_active_v1';
const LOCAL_PROFILE_KEY = 'fache_local_executive_profile_v1';
const LOCAL_SESSIONS_KEY = 'fache_local_executive_sessions_v1';

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isLocalGuest: boolean;
}

export function isLocalGuestActive(): boolean {
  try {
    return localStorage.getItem(LOCAL_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getLocalGuestUser(): LocalUser {
  return {
    uid: LOCAL_GUEST_UID,
    email: 'executive@local.fache',
    displayName: 'Healthcare Executive (Local Mode)',
    photoURL: null,
    isLocalGuest: true
  };
}

export function enableLocalGuestMode(): LocalUser {
  try {
    localStorage.setItem(LOCAL_AUTH_KEY, 'true');
    // Ensure profile is initialized
    getLocalProfile();
  } catch (e) {
    console.warn('Could not write local guest state:', e);
  }
  window.dispatchEvent(new Event('fache-local-auth-changed'));
  return getLocalGuestUser();
}

export function disableLocalGuestMode(): void {
  try {
    localStorage.removeItem(LOCAL_AUTH_KEY);
  } catch (e) {
    console.warn('Could not clear local guest state:', e);
  }
  window.dispatchEvent(new Event('fache-local-auth-changed'));
}

export function getLocalProfile(): any {
  const now = new Date().toISOString();
  const defaultProfile = {
    uid: LOCAL_GUEST_UID,
    email: 'executive@local.fache',
    displayName: 'Healthcare Executive (Local Mode)',
    photoURL: null,
    createdAt: now,
    lastActive: now,
    overallScore: 0,
    domainScores: {
      Healthcare: 0,
      ManagementAndLeadership: 0,
      Finance: 0,
      HumanResources: 0,
      LawsAndRegulations: 0,
      QualityAndPerformance: 0,
      Business: 0,
      HealthcareTechnology: 0,
      ProfessionalismAndEthics: 0,
      Governance: 0
    },
    strengths: [],
    weaknesses: [],
    domainHistory: [],
    badges: [],
    studyDates: [now.split('T')[0]]
  };

  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(defaultProfile));
      return defaultProfile;
    }
    return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {
    return defaultProfile;
  }
}

export function updateLocalProfile(patch: Record<string, any>): any {
  const current = getLocalProfile();
  const updated = {
    ...current,
    ...patch,
    lastActive: new Date().toISOString()
  };
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save local profile:', e);
  }
  return updated;
}

export function getLocalSessions(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLocalSessionById(sessionId: string): any | null {
  const sessions = getLocalSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}

export function saveLocalSession(sessionData: any, existingId?: string): string {
  const sessions = getLocalSessions();
  const id = existingId || `local_sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record = {
    ...sessionData,
    id,
    timestamp: new Date().toISOString()
  };

  const idx = sessions.findIndex((s) => s.id === id);
  if (idx >= 0) {
    sessions[idx] = record;
  } else {
    sessions.unshift(record);
  }

  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save local session:', e);
  }
  return id;
}

export function deleteLocalSession(sessionId: string): any[] {
  const filtered = getLocalSessions().filter((s) => s.id !== sessionId);
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete local session:', e);
  }
  return filtered;
}
