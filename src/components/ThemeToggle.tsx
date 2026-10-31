import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label="Toggle dark mode"
    >
      <span
        className={`${
          theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
        } inline-block h-5 w-5 transform rounded-full bg-white transition-transform z-10`}
      />
      <span className="absolute left-2 flex h-full items-center justify-center text-slate-400 dark:text-slate-300">
        <Moon className="h-3.5 w-3.5" />
      </span>
      <span className="absolute right-2 flex h-full items-center justify-center text-amber-500 dark:text-slate-400">
        <Sun className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
