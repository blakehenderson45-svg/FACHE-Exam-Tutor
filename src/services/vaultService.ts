export interface VaultItem {
  id: string;
  type: 'flashcard' | 'simulator' | 'diagnostic';
  termOrQuestion: string;
  domain: string;
  options?: string[];
  correctAnswer?: string;
  userAnswer?: string;
  explanation: string;
  timestamp: string;
  flaggedManually?: boolean;
  reviewCount: number;
}

const VAULT_STORAGE_KEY = 'fache_missed_flagged_vault_v1';

export function getVaultItems(uid?: string): VaultItem[] {
  try {
    const key = uid ? `${VAULT_STORAGE_KEY}_${uid}` : VAULT_STORAGE_KEY;
    const raw = localStorage.getItem(key) || localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load vault items:', e);
    return [];
  }
}

export function saveVaultItem(
  item: Omit<VaultItem, 'id' | 'timestamp' | 'reviewCount'>,
  uid?: string
): VaultItem {
  const existing = getVaultItems(uid);
  const normalizedTitle = item.termOrQuestion.trim().toLowerCase();
  const existingIdx = existing.findIndex(
    (x) => x.termOrQuestion.trim().toLowerCase() === normalizedTitle
  );

  const now = new Date().toISOString();
  let savedItem: VaultItem;

  if (existingIdx >= 0) {
    savedItem = {
      ...existing[existingIdx],
      ...item,
      timestamp: now,
      reviewCount: (existing[existingIdx].reviewCount || 1) + 1
    };
    existing[existingIdx] = savedItem;
  } else {
    savedItem = {
      ...item,
      id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      reviewCount: 1
    };
    existing.unshift(savedItem);
  }

  try {
    const key = uid ? `${VAULT_STORAGE_KEY}_${uid}` : VAULT_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 200)));
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch (e) {
    console.warn('Failed to save vault item:', e);
  }

  return savedItem;
}

export function removeVaultItem(id: string, uid?: string): VaultItem[] {
  const existing = getVaultItems(uid).filter((item) => item.id !== id);
  try {
    const key = uid ? `${VAULT_STORAGE_KEY}_${uid}` : VAULT_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(existing));
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to remove vault item:', e);
  }
  return existing;
}

export function clearVaultItems(uid?: string): void {
  try {
    const key = uid ? `${VAULT_STORAGE_KEY}_${uid}` : VAULT_STORAGE_KEY;
    localStorage.removeItem(key);
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear vault items:', e);
  }
}
