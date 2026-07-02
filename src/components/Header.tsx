import { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, User, Download, Bell, BellOff, BellRing } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleTheme } from '../store/themeSlice';
import { logout } from '../store/authSlice';

interface HeaderProps {
  connected: boolean;
}

export default function Header({ connected }: HeaderProps) {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Periodically check permission in case it changes outside React
    const interval = setInterval(() => {
      if (typeof Notification !== 'undefined' && Notification.permission !== notifPermission) {
        setNotifPermission(Notification.permission);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearInterval(interval);
    };
  }, [notifPermission]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'text-rose-500';
      case 'operator': return 'text-indigo-500';
      default: return 'text-emerald-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center lg:items-start pb-6 mb-8 gap-6">
      <div className="text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-black nm-text-heading tracking-tight flex items-center justify-center lg:justify-start gap-2">
          <span>❄️</span> Smart Refrigerator Monitor
        </h1>
        <p className="nm-text-dim text-xs sm:text-sm mt-1">IoT Research Project • Real-time Cloud Connection</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* PWA Install Button */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="nm-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-cyan-500 transition-colors"
            title="Install App to Device"
          >
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* User Info & Logout (RBAC) */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="nm-badge flex items-center gap-1.5 font-bold select-none text-[11px]">
              <User className="w-3.5 h-3.5 nm-text-dim" />
              <span className="nm-text-primary hidden md:inline max-w-[120px] truncate">{currentUser.email}</span>
              <span className={`font-black uppercase border-l border-slate-400/20 pl-1.5 ${getRoleColor(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
            
            <button
              onClick={() => dispatch(logout())}
              className="nm-btn p-2 rounded-xl text-rose-500"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="nm-btn flex items-center justify-center p-2 rounded-xl"
          title="Toggle Dark/Light Mode"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Notification Status */}
        <div 
          className="nm-badge flex items-center gap-1.5 text-xs font-mono"
          title={`Notifications: ${notifPermission}`}
        >
          {notifPermission === 'granted' ? (
            <BellRing className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          ) : notifPermission === 'denied' ? (
            <BellOff className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-amber-500" />
          )}
        </div>

        {/* Overall Refrigerator Monitoring Status */}
        <div className="nm-badge flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className={`hidden sm:inline ${connected ? 'text-emerald-500' : 'text-rose-500'}`}>
            {connected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}
