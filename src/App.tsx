import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  isLocalGuestActive,
  getLocalGuestUser,
  getLocalProfile,
  updateLocalProfile
} from './services/localStore';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  const [user, setUser] = useState<any>(
    isLocalGuestActive() ? getLocalGuestUser() : null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLocalAuth = () => {
      if (auth.currentUser) {
        setUser(auth.currentUser);
      } else if (isLocalGuestActive()) {
        getLocalProfile();
        updateLocalProfile({});
        setUser(getLocalGuestUser());
      } else {
        setUser(null);
      }
    };

    window.addEventListener('fache-local-auth-changed', syncLocalAuth);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          const now = new Date().toISOString();

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
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
              }
            });
          } else {
            await updateDoc(userRef, {
              lastActive: now
            });
          }
        } catch (err) {
          console.warn('Firestore profile sync warning:', err);
        }
        setUser(firebaseUser);
      } else if (isLocalGuestActive()) {
        getLocalProfile();
        setUser(getLocalGuestUser());
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('fache-local-auth-changed', syncLocalAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/roadmap"
            element={user ? <Dashboard user={user} initialTab="roadmap" /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={user ? <Dashboard user={user} initialTab="analytics" /> : <Navigate to="/login" />}
          />
          <Route
            path="/badges"
            element={user ? <Dashboard user={user} initialTab="badges" /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!user ? <Auth /> : <Navigate to="/" />}
          />
          <Route
            path="/mode/diagnostic"
            element={user ? <ChatInterface mode="diagnostic" title="Diagnostic Assessment" /> : <Navigate to="/login" />}
          />
          <Route
            path="/mode/simulator"
            element={user ? <ChatInterface mode="simulator" title="Weighted Scenario Simulator" /> : <Navigate to="/login" />}
          />
          <Route
            path="/mode/flashcards"
            element={user ? <ChatInterface mode="flashcards" title="Rapid-Fire Flashcards" /> : <Navigate to="/login" />}
          />
          <Route
            path="/mode/deepdive"
            element={user ? <ChatInterface mode="deepdive" title="The Deep Dive" /> : <Navigate to="/login" />}
          />
          <Route
            path="/session/:sessionId"
            element={user ? <ChatInterface /> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
