import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import { ShieldCheck, LayoutDashboard, History, FileClock } from 'lucide-react';

import { useAppDispatch, useAppSelector } from './store';
import { setConnected } from './store/fridgeSlice';
import { toggleTheme } from './store/themeSlice';
import { logout, getRoleFromEmail, setAuthReady, setUser } from './store/authSlice';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { Sun, Moon, LogOut, User } from 'lucide-react';

import Login from './components/Login';
import SettingsPanel from './components/SettingsPanel';
import UserManagement from './components/UserManagement';
import DashboardView, { LiveData } from './components/DashboardView';
import EventsView, { EventRecord } from './components/EventsView';
import ProfileView from './components/ProfileView';
import AuditTrail from './components/AuditTrail';

export default function App() {
  const dispatch = useAppDispatch();

  // --- Redux state ---
  const currentUser = useAppSelector((state) => state.auth.user);
  const themeMode = useAppSelector((state) => state.theme.mode);
  const connected = useAppSelector((state) => state.fridge.connected);
  const isAuthReady = useAppSelector((state) => state.auth.isAuthReady);

  // --- Local state ---
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'users' | 'config' | 'profile' | 'audit'>('dashboard');
  const [eventBadge, setEventBadge] = useState(0);
  const maxTemp = useAppSelector((state) => state.settings?.maxTempThreshold ?? 8);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Sync auth state with Redux
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({ email: user.email || '', role: getRoleFromEmail(user.email || '') }));
      } else {
        dispatch(logout());
      }
      dispatch(setAuthReady(true));
    });
    return () => unsubscribe();
  }, [dispatch]);

  // Subscribe to /live and /events from RTDB.
  // IMPORTANT: depend on currentUser?.email (a stable primitive string) NOT the whole
  // currentUser object — Redux creates a new object reference on every setUser() call,
  // which would tear down and re-create the listener unnecessarily, causing visible delays.
  const currentUserEmail = currentUser?.email;
  useEffect(() => {
    if (!currentUserEmail) return;

    // --- /live listener ---
    const liveRef = ref(db, '/live');
    const unsubLive = onValue(liveRef, (snap) => {
      if (snap.exists()) {
        setLiveData(snap.val() as LiveData);
        dispatch(setConnected(true));
      }
    }, (err) => {
      console.error('RTDB /live error:', err);
      dispatch(setConnected(false));
    });

    // --- /events listener ---
    const eventsRef = ref(db, '/events');
    const unsubEvents = onValue(eventsRef, (snap) => {
      if (snap.exists()) {
        const raw = snap.val() as Record<string, Omit<EventRecord, 'id'>>;
        const list: EventRecord[] = Object.entries(raw).map(([id, val]) => ({
          id,
          ...val,
        }));
        // Latest first
        list.sort((a, b) => b.timestamp - a.timestamp);
        setEvents(list);
        setEventBadge((prev) => prev + 1);
      }
    }, (err) => {
      console.error('RTDB /events error:', err);
    });

    return () => {
      unsubLive();
      unsubEvents();
    };
  }, [currentUserEmail, dispatch]);

  const handleAcknowledge = (id: string) => {
    setEvents(prev => prev.map(e =>
      e.id === id
        ? { ...e, acknowledged: true, acknowledgedBy: currentUser?.email || 'Unknown' }
        : e
    ));
  };

  // Clear badge when visiting events tab
  useEffect(() => {
    if (activeTab === 'events') setEventBadge(0);
  }, [activeTab]);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'text-rose-500';
      case 'operator': return 'text-indigo-500';
      default: return 'text-emerald-500';
    }
  };

  // --- Show login if not authenticated ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ background: 'var(--nm-bg)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
          <p className="nm-text-dim text-xs font-bold tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen nm-text-primary font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 border-b border-dashed border-slate-700/20 backdrop-blur-sm"
        style={{ background: 'var(--nm-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-black nm-text-heading tracking-tight flex items-center gap-2">
              <span>❄️</span> Smart Refrigerator Monitor
            </h1>
            <p className="nm-text-dim text-xs mt-0.5">IoT Project · Firebase Realtime Database</p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* User Badge + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="nm-badge flex items-center gap-1.5 font-bold text-[11px]">
                  <User className="w-3.5 h-3.5 nm-text-dim" />
                  <span className="nm-text-primary hidden sm:inline max-w-[120px] truncate">{currentUser.email}</span>
                  <span className={`font-black uppercase border-l border-slate-400/20 pl-1.5 ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    signOut(auth);
                    dispatch(logout());
                  }}
                  className="nm-btn p-2 rounded-xl text-rose-500"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="nm-btn flex items-center justify-center p-2.5 rounded-full"
              title="Toggle Theme"
            >
              {themeMode === 'dark'
                ? <Sun className="w-5 h-5 text-amber-400" />
                : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            {/* DB Status */}
            <div className="nm-badge flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span className={connected ? 'text-emerald-500' : 'text-amber-500'}>
                {connected ? 'LIVE' : 'CONNECTING...'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-0 flex gap-1">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'nm-inset text-cyan-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            id="tab-events"
            onClick={() => { setActiveTab('events'); setEventBadge(0); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 relative ${
              activeTab === 'events'
                ? 'nm-inset text-indigo-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Events
            {eventBadge > 0 && activeTab !== 'events' && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {eventBadge > 9 ? '9+' : eventBadge}
              </span>
            )}
          </button>

          {/* Config tab (Admins & Operators) */}
          {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
            <button
              id="tab-config"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                activeTab === 'config'
                  ? 'nm-inset text-indigo-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Configurations
            </button>
          )}

          {/* Audit Trail tab (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              id="tab-audit"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                activeTab === 'audit'
                  ? 'nm-inset text-amber-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <FileClock className="w-3.5 h-3.5" />
              Audit Log
            </button>
          )}

          {/* User Management tab (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              id="tab-users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                activeTab === 'users'
                  ? 'nm-inset text-rose-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              User Management
            </button>
          )}

          {/* Profile tab */}
          <button
            id="tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
              activeTab === 'profile'
                ? 'nm-inset text-cyan-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </button>
        </div>
      </header>

      {/* ========== PAGE CONTENT ========== */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
        {activeTab === 'dashboard' && <DashboardView liveData={liveData} maxTemp={maxTemp} />}
        {activeTab === 'events' && (
          <EventsView
            events={events}
            canView={currentUser.role !== 'viewer'}
            onAcknowledge={handleAcknowledge}
          />
        )}
        {activeTab === 'config' && (currentUser.role === 'admin' || currentUser.role === 'operator') && <SettingsPanel />}
        {activeTab === 'users' && currentUser.role === 'admin' && <UserManagement />}
        {activeTab === 'audit' && currentUser.role === 'admin' && <AuditTrail entries={[]} />}
        {activeTab === 'profile' && <ProfileView />}
      </main>
    </div>
  );
}
