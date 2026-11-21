import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Send,
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  CheckSquare,
  RefreshCw,
  Zap,
  Volume2,
  Square,
  ExternalLink,
  Brain,
  RotateCcw,
  Bookmark,
  BookOpen,
  Timer,
  Pause,
  Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  getFlashcard,
  evaluateAssessment,
  streamTutorResponse,
  synthesizeSpeech,
  GroundingSource,
  ThinkingDepth
} from '../services/geminiService';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  isLocalGuestActive,
  getLocalGuestUser,
  getLocalProfile,
  updateLocalProfile,
  getLocalSessionById,
  saveLocalSession
} from '../services/localStore';
import { getVaultItems, saveVaultItem } from '../services/vaultService';
import ExecutiveReferenceModal from './ExecutiveReferenceModal';
import ThemeToggle from './ThemeToggle';

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  isError?: boolean;
}

interface ParsedMcqOption {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

/**
 * Extracts A, B, C, D multiple-choice options from markdown text when present.
 */
function extractMcqOptions(markdownText: string): ParsedMcqOption[] {
  if (!markdownText) return [];
  const lines = markdownText.split('\n');
  const found: Map<'A' | 'B' | 'C' | 'D', string> = new Map();

  // Match lines like "A. ...", "A) ...", "**A.** ...", "**A)** ...", "- **A.** ..."
  const optionRegex = /^\s*(?:[-*]\s*)?(?:\*\*)?([A-D])(?:[.)]|\*\*:\s*|\*\*[.)])\s*(?:\*\*)?\s*(.+)$/i;

  for (const line of lines) {
    const match = line.match(optionRegex);
    if (match) {
      const letter = match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const cleanText = match[2].replace(/\*\*$/g, '').trim();
      if (cleanText.length > 0) {
        found.set(letter, cleanText);
      }
    }
  }

  if (found.has('A') && found.has('B') && found.has('C') && found.has('D')) {
    return (['A', 'B', 'C', 'D'] as const).map((letter) => ({
      letter,
      text: found.get(letter)!
    }));
  }
  return [];
}

const FlashcardMessage = ({
  data,
  onNext,
  isLatest,
  onSpeak,
  isSpeaking,
  uid
}: {
  data: any;
  onNext: (msg: string) => void;
  isLatest: boolean;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  uid?: string;
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [savedToVault, setSavedToVault] = useState(false);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);

    // Automatically save missed ("Incorrect" or "I don't know") flashcards into the Missed & Flagged Vault
    if (idx !== data.correctOptionIndex) {
      saveVaultItem(
        {
          type: 'flashcard',
          termOrQuestion: data.term,
          domain: data.domain || 'General Healthcare Management',
          options: data.options,
          correctAnswer: data.options?.[data.correctOptionIndex] || '',
          userAnswer: idx === -1 ? "I don't know" : data.options?.[idx] || '',
          explanation: data.explanation || ''
        },
        uid
      );
      setSavedToVault(true);
    }
  };

  const handleManualFlag = () => {
    saveVaultItem(
      {
        type: 'flashcard',
        termOrQuestion: data.term,
        domain: data.domain || 'General Healthcare Management',
        options: data.options,
        correctAnswer: data.options?.[data.correctOptionIndex] || '',
        explanation: data.explanation || '',
        flaggedManually: true
      },
      uid
    );
    setSavedToVault(true);
  };

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Flashcard
          </span>
          {data.domain && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
              {data.domain}
            </span>
          )}
          {savedToVault && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/30">
              <Bookmark className="w-3 h-3 fill-current" />
              Saved to Vault
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleManualFlag}
            className={`p-1.5 rounded-lg transition-colors ${
              savedToVault
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={savedToVault ? 'Saved in Missed & Flagged Vault' : 'Flag flashcard for review'}
          >
            <Bookmark className={`w-4 h-4 ${savedToVault ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() =>
              onSpeak(
                `${data.term}. ${
                  selected !== null ? data.explanation : data.options.join('. ')
                }`
              )
            }
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isSpeaking ? 'Stop audio' : 'Read aloud'}
          >
            {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white mb-6">
        {data.term}
      </div>
      <div className="flex flex-col gap-3">
        {data.options.map((opt: string, idx: number) => {
          let btnClass =
            'text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ';
          if (selected === null) {
            btnClass +=
              'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer';
          } else {
            if (idx === data.correctOptionIndex) {
              btnClass +=
                'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-500 dark:text-emerald-100';
            } else if (idx === selected) {
              btnClass +=
                'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/20 dark:border-red-500 dark:text-red-100';
            } else {
              btnClass +=
                'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 opacity-60';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={btnClass}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected === null && isLatest && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => handleSelect(-1)}
            className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            I don't know
          </button>
        </div>
      )}

      {selected !== null && (
        <div className="mt-6 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center justify-between gap-2 font-semibold mb-2">
            <div>
              {selected === data.correctOptionIndex ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5" /> Correct!
                </span>
              ) : selected === -1 ? (
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Info className="w-5 h-5" /> Saved to Vault for review.
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="w-5 h-5" /> Incorrect — auto-saved to Vault.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSpeak(data.explanation)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" /> Listen
            </button>
          </div>
          <p className="text-sm leading-relaxed">{data.explanation}</p>
          {isLatest && (
            <button
              onClick={() =>
                onNext(
                  `I selected: ${
                    selected === -1 ? "I don't know" : data.options[selected]
                  }. Next flashcard.`
                )
              }
              className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              Next Flashcard <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EXAM_DOMAINS = [
  'Healthcare (15%)',
  'Management/Leadership (13%)',
  'Finance (12%)',
  'HR (12%)',
  'Laws/Regs (9%)',
  'Quality/PI (9%)',
  'Business (8%)',
  'IT (8%)',
  'Professionalism/Ethics (8%)',
  'Governance (6%)'
];

export default function ChatInterface({
  mode: initialMode,
  title: initialTitle
}: {
  mode?: 'diagnostic' | 'simulator' | 'flashcards' | 'deepdive';
  title?: string;
}) {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const focusedDomainKey = searchParams.get('domain');
  const focusedDomainTitle = searchParams.get('domainTitle');
  const isRemediationDrill = searchParams.get('remediation') === 'true';
  const navigate = useNavigate();

  const currentUser = auth.currentUser || (isLocalGuestActive() ? getLocalGuestUser() : null);
  const currentUid = currentUser?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingDepth>('MEDIUM');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [flaggedMessageIndices, setFlaggedMessageIndices] = useState<Record<number, boolean>>({});
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  // Exam Pace Timer state (for Diagnostic & Simulator)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [title, setTitle] = useState(
    isRemediationDrill
      ? `Remediation Vault Drill${focusedDomainTitle ? `: ${focusedDomainTitle}` : ''}`
      : focusedDomainTitle
      ? `Focused Session: ${focusedDomainTitle}`
      : initialTitle || ''
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Run exam pace timer in diagnostic & simulator modes
  useEffect(() => {
    if ((mode !== 'diagnostic' && mode !== 'simulator') || timerPaused) {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, timerPaused]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = async (text: string, idx: number) => {
    if (speakingIdx === idx) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingIdx(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingIdx(idx);
    try {
      const audioUrl = await synthesizeSpeech(text);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeakingIdx(null);
      audio.onerror = () => setSpeakingIdx(null);
      await audio.play();
    } catch {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          text.replace(/[#*_`~>-]/g, ' ').slice(0, 1000)
        );
        utterance.onend = () => setSpeakingIdx(null);
        utterance.onerror = () => setSpeakingIdx(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeakingIdx(null);
      }
    }
  };

  const handleFlagMessage = (msg: Message, idx: number) => {
    const firstLine =
      msg.text
        .split('\n')
        .map((l) => l.replace(/[#*>_-]/g, '').trim())
        .find((l) => l.length > 15) || 'Flagged Executive Scenario';

    saveVaultItem(
      {
        type: mode === 'simulator' ? 'simulator' : 'diagnostic',
        termOrQuestion: firstLine.slice(0, 220),
        domain: focusedDomainTitle || (mode === 'simulator' ? 'BOG Simulator Scenario' : 'Diagnostic Assessment'),
        explanation: msg.text.slice(0, 1400),
        flaggedManually: true
      },
      currentUid
    );

    setFlaggedMessageIndices((prev) => ({ ...prev, [idx]: true }));
  };

  // Compute effective domainFocus string including remediation vault context if active
  const effectiveDomainFocus = useMemo(() => {
    if (isRemediationDrill) {
      const vaultItems = getVaultItems(currentUid).slice(0, 8);
      if (vaultItems.length > 0) {
        const missedSummary = vaultItems
          .map((v) => `${v.termOrQuestion} (${v.domain})`)
          .join('; ');
        return `${
          focusedDomainTitle ? `${focusedDomainTitle} — ` : ''
        }Remediation Drill specifically targeting these previously missed/flagged concepts: ${missedSummary}`;
      }
    }
    return focusedDomainTitle || undefined;
  }, [isRemediationDrill, focusedDomainTitle, currentUid]);

  useEffect(() => {
    const loadSession = async () => {
      if (sessionId) {
        setLoading(true);
        try {
          let data: any = null;
          if (sessionId.startsWith('local_sess_') || isLocalGuestActive()) {
            data = getLocalSessionById(sessionId);
          }
          if (!data && auth.currentUser) {
            const sessionRef = doc(db, 'sessions', sessionId);
            const sessionSnap = await getDoc(sessionRef);
            if (sessionSnap.exists()) {
              data = sessionSnap.data();
            }
          }

          if (data) {
            const loadedMessages = JSON.parse(data.history);
            setMessages(loadedMessages);

            let loadedMode: 'diagnostic' | 'simulator' | 'flashcards' | 'deepdive' =
              'diagnostic';
            let loadedTitle = 'Diagnostic Assessment';

            if (data.mode === 'Diagnostic') {
              loadedMode = 'diagnostic';
              loadedTitle = 'Diagnostic Assessment';
            } else if (data.mode === 'Simulator') {
              loadedMode = 'simulator';
              loadedTitle = 'Weighted Scenario Simulator';
            } else if (data.mode === 'Flashcards') {
              loadedMode = 'flashcards';
              loadedTitle = 'Rapid-Fire Flashcards';
            } else if (data.mode === 'DeepDive') {
              loadedMode = 'deepdive';
              loadedTitle = 'The Deep Dive';
            }

            setMode(loadedMode);
            setTitle(loadedTitle);
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error('Error loading session:', error);
          navigate('/');
        } finally {
          setLoading(false);
        }
      } else if (messages.length === 0 && mode) {
        handleInitialMessage();
      }
    };

    loadSession();
  }, [sessionId, initialMode, focusedDomainKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInitialMessage = async () => {
    setLoading(true);
    try {
      if (mode === 'flashcards') {
        const responseText = await getFlashcard([], {
          domainFocus: effectiveDomainFocus
        });
        setMessages([{ role: 'model', text: responseText }]);
      } else if (mode === 'deepdive' && !effectiveDomainFocus) {
        setMessages([
          {
            role: 'model',
            text: 'What ACHE concept would you like to deep dive into?'
          }
        ]);
      } else if (mode === 'diagnostic' || mode === 'simulator' || mode === 'deepdive') {
        const deepDiveQuery =
          mode === 'deepdive' && effectiveDomainFocus
            ? `Targeted Executive Deep Dive for ACHE Board of Governors Exam Domain: ${effectiveDomainFocus}. Provide high-yield principles, regulatory and operational frameworks, clinical/management scenarios, and practice question drills to master this domain.`
            : undefined;

        setMessages([{ role: 'model', text: '' }]);
        const result = await streamTutorResponse(
          {
            mode,
            history: [],
            query: deepDiveQuery,
            thinkingLevel,
            domainFocus: effectiveDomainFocus
          },
          (partialText) => {
            setMessages([{ role: 'model', text: partialText }]);
          }
        );
        setMessages([
          {
            role: 'model',
            text: result.text,
            sources: result.sources
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error fetching initial message:', error);
      setMessages([
        {
          role: 'model',
          text:
            error?.message ||
            'An error occurred while connecting to the AI tutor. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (userMessage: string) => {
    const cleanHistory = messages.filter((m) => !m.isError);
    const newMessages: Message[] = [
      ...cleanHistory,
      { role: 'user', text: userMessage }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      if (mode === 'flashcards') {
        const responseText = await getFlashcard(newMessages, {
          domainFocus: effectiveDomainFocus
        });
        setMessages([...newMessages, { role: 'model', text: responseText }]);
      } else if (
        mode === 'diagnostic' ||
        mode === 'simulator' ||
        mode === 'deepdive'
      ) {
        setMessages([...newMessages, { role: 'model', text: '' }]);
        const result = await streamTutorResponse(
          {
            mode,
            history: mode === 'deepdive' ? cleanHistory : newMessages,
            query: mode === 'deepdive' ? userMessage : undefined,
            thinkingLevel,
            domainFocus: effectiveDomainFocus
          },
          (partialText) => {
            setMessages([
              ...newMessages,
              { role: 'model', text: partialText }
            ]);
          }
        );
        setMessages([
          ...newMessages,
          {
            role: 'model',
            text: result.text,
            sources: result.sources
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error fetching response:', error);
      setMessages([
        ...newMessages,
        {
          role: 'model',
          text:
            error?.message ||
            'An error occurred while generating a response. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length === 0) {
      handleInitialMessage();
    } else {
      const lastUserMsg = userMessages[userMessages.length - 1].text;
      const withoutLastTurn = messages.slice(0, -2);
      setMessages(withoutLastTurn);
      sendMessage(lastUserMsg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  const handleRestart = async () => {
    setMessages([]);
    setElapsedSeconds(0);
    await handleInitialMessage();
  };

  const handleSaveAndExit = async () => {
    if (messages.length === 0) {
      navigate('/');
      return;
    }

    setSaving(true);
    try {
      const sessionData = {
        uid: currentUid || 'local-executive-guest',
        mode:
          mode === 'diagnostic'
            ? 'Diagnostic'
            : mode === 'simulator'
            ? 'Simulator'
            : mode === 'flashcards'
            ? 'Flashcards'
            : 'DeepDive',
        timestamp: new Date().toISOString(),
        history: JSON.stringify(messages.filter((m) => !m.isError)),
        summary: focusedDomainTitle
          ? `Focused session on ${focusedDomainTitle} (${messages.length} messages)`
          : `Session with ${messages.length} messages.`
      };

      // Always save to local store as fast backup & for Local Executive Mode
      saveLocalSession(sessionData, sessionId);
      updateLocalProfile({ lastActive: new Date().toISOString() });

      const fbUser = auth.currentUser;
      if (fbUser) {
        if (sessionId && !sessionId.startsWith('local_sess_')) {
          await updateDoc(doc(db, 'sessions', sessionId), sessionData);
        } else {
          await addDoc(collection(db, 'sessions'), sessionData);
        }

        try {
          const userRef = doc(db, 'users', fbUser.uid);
          await updateDoc(userRef, {
            lastActive: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Could not update user lastActive:', e);
        }
      }
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setSaving(false);
      navigate('/');
    }
  };

  const submitAssessment = async () => {
    setLoading(true);
    try {
      const evaluationText = await evaluateAssessment(
        messages.filter((m) => !m.isError)
      );
      const evaluation = JSON.parse(evaluationText);

      const newSnapshot = {
        timestamp: new Date().toISOString(),
        dateLabel: 'Today',
        sessionMode:
          mode === 'diagnostic'
            ? 'Diagnostic Assessment'
            : 'Simulator Evaluation',
        compositeScore: Number(evaluation.overallScore) || 3.0,
        scores: evaluation.domainScores || {}
      };

      // Update Local Profile
      const localProf = getLocalProfile();
      const localHistory = Array.isArray(localProf?.domainHistory)
        ? localProf.domainHistory
        : [];
      updateLocalProfile({
        overallScore: evaluation.overallScore,
        domainScores: evaluation.domainScores,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        domainHistory: [...localHistory, newSnapshot].slice(-15)
      });

      const fbUser = auth.currentUser;
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          const currentData = userSnap.exists() ? userSnap.data() : {};
          const existingHistory = Array.isArray(currentData?.domainHistory)
            ? currentData.domainHistory
            : [];
          const updatedHistory = [...existingHistory, newSnapshot].slice(-15);

          await updateDoc(userRef, {
            overallScore: evaluation.overallScore,
            domainScores: evaluation.domainScores,
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses,
            domainHistory: updatedHistory,
            lastActive: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Firestore evaluation update fell back to local storage:', e);
        }
      }

      setMessages([
        ...messages,
        {
          role: 'model',
          text: `### Assessment Complete\n\n**Overall Score: ${
            evaluation.overallScore
          }/5**\n\n**Strengths:**\n${(evaluation.strengths || [])
            .map((s: string) => `- ${s}`)
            .join('\n')}\n\n**Areas for Improvement:**\n${(
            evaluation.weaknesses || []
          )
            .map((w: string) => `- ${w}`)
            .join(
              '\n'
            )}\n\nYour profile has been updated with these results. You can view them on your dashboard.`
        }
      ]);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setMessages([
        ...messages,
        {
          role: 'model',
          text: 'An error occurred while evaluating your assessment. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions =
    mode === 'diagnostic' ? 10 : mode === 'simulator' ? 200 : 0;
  const currentQuestion = messages.filter((m) => m.role === 'user').length;
  const progressPercentage =
    totalQuestions > 0
      ? Math.min(100, (currentQuestion / totalQuestions) * 100)
      : 0;

  const avgSecondsPerQuestion =
    currentQuestion > 0 ? Math.round(elapsedSeconds / currentQuestion) : elapsedSeconds;

  const isAssessmentComplete =
    (mode === 'diagnostic' && currentQuestion >= 10) ||
    (mode === 'simulator' && currentQuestion >= 200);

  const hasEvaluatedAlready =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'model' &&
    messages[messages.length - 1].text.includes('Assessment Complete');

  // Detect parsed A/B/C/D options on the latest model message for interactive 1-tap answering
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const latestMcqOptions = useMemo(() => {
    if (
      (mode === 'diagnostic' || mode === 'simulator') &&
      latestMessage &&
      latestMessage.role === 'model' &&
      !latestMessage.isError &&
      !loading &&
      !hasEvaluatedAlready
    ) {
      return extractMcqOptions(latestMessage.text);
    }
    return [];
  }, [mode, latestMessage, loading, hasEvaluatedAlready]);

  const showQuickLetterBar =
    (mode === 'diagnostic' || mode === 'simulator') &&
    latestMessage &&
    latestMessage.role === 'model' &&
    !latestMessage.isError &&
    !loading &&
    !isAssessmentComplete &&
    !hasEvaluatedAlready &&
    latestMcqOptions.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Exam Pace Timer Pill for Diagnostic & Simulator */}
            {(mode === 'diagnostic' || mode === 'simulator') && (
              <button
                type="button"
                onClick={() => setTimerPaused((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  timerPaused
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : avgSecondsPerQuestion > 72 && currentQuestion > 0
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Exam Pace Timer (Official BOG Pace: 72s/question). Click to pause/resume."
              >
                <Timer className="w-3.5 h-3.5 text-indigo-500" />
                <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
                {currentQuestion > 0 && (
                  <span className="hidden sm:inline text-[10px] opacity-75">
                    ({avgSecondsPerQuestion}s/q)
                  </span>
                )}
                {timerPaused ? (
                  <Play className="w-3 h-3" />
                ) : (
                  <Pause className="w-3 h-3 opacity-60" />
                )}
              </button>
            )}

            {/* Quick Reference & Formula Sheet Drawer Button */}
            <button
              type="button"
              onClick={() => setIsReferenceOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Open Executive Formula & Statute Reference Sheet"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden lg:inline">Formulas & Statutes</span>
            </button>

            {mode !== 'flashcards' && (
              <div
                className="hidden md:inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs"
                title="Gemini 3 Reasoning Depth"
              >
                <span className="pl-2 pr-1 text-slate-400 flex items-center">
                  <Brain className="w-3.5 h-3.5" />
                </span>
                {(['LOW', 'MEDIUM', 'HIGH'] as ThinkingDepth[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setThinkingLevel(lvl)}
                    className={`px-2 py-1 rounded-full font-semibold transition-all ${
                      thinkingLevel === lvl
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {lvl === 'LOW' ? 'Fast' : lvl === 'MEDIUM' ? 'Balanced' : 'Deep'}
                  </button>
                ))}
              </div>
            )}

            {(mode === 'diagnostic' || mode === 'simulator') &&
              currentQuestion >= 3 &&
              !isAssessmentComplete &&
              !hasEvaluatedAlready && (
                <button
                  onClick={submitAssessment}
                  disabled={loading}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-full transition-colors disabled:opacity-50"
                  title="Evaluate answers and update your 10-domain scores now"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Evaluate Now</span>
                </button>
              )}

            <ThemeToggle />
            {!sessionId && messages.length > 1 && (
              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Restart Session"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Restart</span>
              </button>
            )}
            <button
              onClick={handleSaveAndExit}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-full transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Save & Exit</span>
            </button>
          </div>
        </div>
        {totalQuestions > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800/50 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                Question {Math.min(currentQuestion + 1, totalQuestions)} of {totalQuestions}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {(focusedDomainTitle || isRemediationDrill) && (
            <div className="bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/20 dark:to-indigo-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {isRemediationDrill
                      ? 'Missed & Flagged Vault Remediation'
                      : 'Study Roadmap Focused Session'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRemediationDrill
                      ? `Drilling Missed Concepts${focusedDomainTitle ? ` (${focusedDomainTitle})` : ''}`
                      : `Targeted Review: ${focusedDomainTitle}`}
                  </h3>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
                High-Yield Gap Closure
              </span>
            </div>
          )}

          {mode === 'deepdive' && !focusedDomainTitle && !isRemediationDrill && messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Info className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Choose a Domain to Deep Dive
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-8">
                Select one of the core exam domains below to start a comprehensive review, or type any specific topic you'd like to explore.
              </p>
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                {EXAM_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    onClick={() =>
                      sendMessage(`I want to do a deep dive into the ${domain} domain.`)
                    }
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full transition-all shadow-sm"
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (msg.role === 'model' && !msg.text && loading) {
              return null;
            }

            const isLatest = idx === messages.length - 1;
            let isFlashcard = false;
            let flashcardData = null;

            if (mode === 'flashcards' && msg.role === 'model' && !msg.isError) {
              try {
                flashcardData = JSON.parse(msg.text);
                if (
                  flashcardData.term &&
                  flashcardData.options &&
                  typeof flashcardData.correctOptionIndex === 'number'
                ) {
                  isFlashcard = true;
                }
              } catch {
                // Not valid flashcard JSON, render as regular message
              }
            }

            if (isFlashcard) {
              return (
                <div key={idx} className="flex justify-start w-full">
                  <FlashcardMessage
                    data={flashcardData}
                    onNext={sendMessage}
                    isLatest={isLatest}
                    onSpeak={(t) => handleSpeak(t, idx)}
                    isSpeaking={speakingIdx === idx}
                    uid={currentUid}
                  />
                </div>
              );
            }

            const isFlagged = Boolean(flaggedMessageIndices[idx]);

            return (
              <div key={idx} className="space-y-3">
                <div
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-br-sm'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-bl-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div>
                        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>

                        {msg.isError && (
                          <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-800/50 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRetry}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Retry Request
                            </button>
                          </div>
                        )}

                        {!msg.isError && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                              Grounded Search Sources
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-xs truncate"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{src.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {!msg.isError && msg.text && (
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3">
                            {(mode === 'simulator' || mode === 'diagnostic') ? (
                              <button
                                type="button"
                                onClick={() => handleFlagMessage(msg, idx)}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                  isFlagged
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                                }`}
                                title="Save scenario to Missed & Flagged Vault for review"
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                                <span>{isFlagged ? 'Saved to Vault' : 'Flag for Review'}</span>
                              </button>
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              onClick={() => handleSpeak(msg.text, idx)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title={speakingIdx === idx ? 'Stop audio' : 'Listen to explanation'}
                            >
                              {speakingIdx === idx ? (
                                <>
                                  <Square className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-indigo-600 dark:text-indigo-400">Stop Audio</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive 1-Tap A/B/C/D Choice Cards for Latest Diagnostic/Simulator Question */}
                {isLatest && latestMcqOptions.length === 4 && (
                  <div className="pl-1 sm:pl-2 max-w-[88%] sm:max-w-[85%] space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1">
                      Tap an option to submit your answer:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {latestMcqOptions.map((opt) => (
                        <button
                          key={opt.letter}
                          type="button"
                          disabled={loading}
                          onClick={() => sendMessage(`${opt.letter}. ${opt.text}`)}
                          className="group flex items-start gap-3 text-left p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all shadow-xs active:scale-[0.99]"
                        >
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                            {opt.letter}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                            {opt.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Architect is thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 transition-colors duration-200">
        <div className="max-w-3xl mx-auto">
          {/* Fallback Quick-Tap A / B / C / D / Next Question Chips for Diagnostic & Simulator */}
          {showQuickLetterBar && (
            <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">
                Quick Answer:
              </span>
              {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => sendMessage(`Option ${letter}`)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                >
                  Option {letter}
                </button>
              ))}
              <button
                type="button"
                onClick={() => sendMessage('Next question please.')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Next Question &rarr;
              </button>
            </div>
          )}

          {mode === 'deepdive' &&
            messages.length > 1 &&
            !loading &&
            messages[messages.length - 1].role === 'model' && (
              <div className="flex flex-wrap justify-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() =>
                    sendMessage(
                      'Please provide a case study to dive deeper into this concept.'
                    )
                  }
                  className="px-5 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-full transition-colors shadow-sm active:scale-95"
                >
                  Generate Case Study
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMessages([
                      {
                        role: 'model',
                        text: 'What ACHE concept would you like to deep dive into?'
                      }
                    ])
                  }
                  className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors shadow-sm active:scale-95"
                >
                  Switch Domain
                </button>
              </div>
            )}

          {(isAssessmentComplete &&
            messages[messages.length - 1]?.role !== 'model') ||
          (isAssessmentComplete &&
            messages[messages.length - 1]?.role === 'model' &&
            !hasEvaluatedAlready) ? (
            <div className="flex justify-center mb-4">
              <button
                onClick={submitAssessment}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckSquare className="w-5 h-5" />
                )}
                Submit Assessment
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isAssessmentComplete
                    ? 'Assessment complete. You can still ask questions...'
                    : 'Tap an option above or type your answer / follow-up question...'
                }
                className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 rounded-full pl-6 pr-14 py-4 text-slate-900 dark:text-white transition-all outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </footer>

      {/* Searchable Executive Reference & Formula Sheet Modal */}
      <ExecutiveReferenceModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onSelectForDeepDive={
          mode === 'deepdive'
            ? (topicTitle) => sendMessage(`Provide an executive deep dive and BOG exam application for: ${topicTitle}`)
            : undefined
        }
      />
    </div>
  );
}
