import React from 'react';
import { signInWithGoogle } from '../firebase';
import { LogIn, Activity } from 'lucide-react';

export default function Auth() {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl dark:shadow-indigo-900/20 p-10 text-center border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Activity className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">FACHE Exam Tutor</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg">Elite AI Tutor for the ACHE Board of Governors Exam</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white py-4 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
