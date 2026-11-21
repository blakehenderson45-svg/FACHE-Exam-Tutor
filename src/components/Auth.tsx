import React, { useState } from 'react';
import { signInWithGoogle } from '../firebase';
import { enableLocalGuestMode } from '../services/localStore';
import { LogIn, Activity, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react';

export default function Auth() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleLogin = async () => {
    setAuthError(null);
    setIsUnauthorizedDomain(false);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Login failed', error);
      const code = error?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setAuthError(
          `This domain (${currentHostname}) is not yet added to Firebase Authorized Domains.`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing authentication.');
      } else {
        setAuthError(error?.message || 'Google Sign-In could not be completed.');
      }
    }
  };

  const handleCopyDomain = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleGuestMode = () => {
    enableLocalGuestMode();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl dark:shadow-indigo-900/20 p-8 sm:p-10 text-center border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Activity className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
          FACHE Exam Tutor
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-base sm:text-lg">
          Elite AI Tutor for the ACHE Board of Governors Exam
        </p>

        {authError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-left">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-2 flex-1">
                <p className="font-bold">{authError}</p>
                {isUnauthorizedDomain && (
                  <>
                    <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                      To enable Google Sign-In on this deployment URL, add{' '}
                      <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono font-semibold">
                        {currentHostname}
                      </code>{' '}
                      in <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</strong>, or continue immediately below in Local Executive Mode.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold hover:bg-amber-100/50 transition-colors"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied {currentHostname}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Domain ({currentHostname})</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white py-4 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>

          <button
            type="button"
            onClick={handleGuestMode}
            className="w-full flex items-center justify-center gap-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all border border-slate-200/80 dark:border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Continue in Local Executive Mode
          </button>
        </div>

        <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
          Local Executive Mode saves your diagnostic scores, study sessions, and missed-concept vault directly in your browser.
        </p>
      </div>
    </div>
  );
}
