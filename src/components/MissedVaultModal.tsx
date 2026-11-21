import React, { useState, useMemo } from 'react';
import {
  X,
  Bookmark,
  Trash2,
  Zap,
  CheckCircle2,
  Search,
  Layers,
  Target,
  Activity
} from 'lucide-react';
import { VaultItem, removeVaultItem } from '../services/vaultService';

interface MissedVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  uid?: string;
  onItemsChanged: (updated: VaultItem[]) => void;
  onLaunchRemediationDrill: (item?: VaultItem) => void;
}

export default function MissedVaultModal({
  isOpen,
  onClose,
  items,
  uid,
  onItemsChanged,
  onLaunchRemediationDrill
}: MissedVaultModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'flashcard' | 'simulator' | 'diagnostic'>('all');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) {
        return false;
      }
      if (!q) return true;
      return (
        item.termOrQuestion.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, filterType]);

  if (!isOpen) return null;

  const handleMarkMastered = (id: string) => {
    const updated = removeVaultItem(id, uid);
    onItemsChanged(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Missed & Flagged Concepts Vault
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  {items.length} Saved
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Automatically captures missed flashcards and flagged simulator questions for targeted remediation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved concepts, domains, or rationales..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'flashcard', 'simulator', 'diagnostic'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterType === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {t === 'all' ? 'All Items' : `${t}s`}
              </button>
            ))}

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onLaunchRemediationDrill();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Drill Missed Concepts</span>
              </button>
            )}
          </div>
        </div>

        {/* Vault List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {items.length === 0 ? 'Your Remediation Vault is Clear!' : 'No Matching Vault Items'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {items.length === 0
                  ? 'Any flashcard you miss or question you flag in the Scenario Simulator will automatically appear here for high-yield review.'
                  : 'Try adjusting your search filter.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      {item.type === 'flashcard' ? (
                        <Layers className="w-3 h-3" />
                      ) : item.type === 'simulator' ? (
                        <Target className="w-3 h-3" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      <span className="capitalize">{item.type}</span>
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.domain}
                    </span>
                    {item.reviewCount > 1 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Missed/Flagged {item.reviewCount}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onLaunchRemediationDrill(item);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Drill Topic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkMastered(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                      title="Mark mastered and remove from vault"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mastered</span>
                    </button>
                  </div>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {item.termOrQuestion}
                </h4>

                {item.correctAnswer && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                    <span className="font-bold">Correct Answer: </span>
                    {item.correctAnswer}
                  </div>
                )}

                {item.explanation && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {item.explanation}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
