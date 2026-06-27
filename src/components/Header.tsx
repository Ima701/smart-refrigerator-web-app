import { Sun, Moon, LogOut, User } from 'lucide-react';
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

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'text-rose-500';
      case 'operator':
        return 'text-indigo-500';
      default:
        return 'text-emerald-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pb-6 mb-8 gap-4 border-b border-dashed border-slate-700/20">
      <div>
        <h1 className="text-3xl font-black nm-text-heading tracking-tight flex items-center gap-2">
          <span>❄️</span> Smart Refrigerator Live Monitor
        </h1>
        <p className="nm-text-dim text-sm mt-1">IoT Research Project • Real-time Cloud Firebase Connection</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* User Info & Logout (RBAC) */}
        {currentUser && (
          <div className="flex items-center gap-2.5 mr-2">
            <div className="nm-badge flex items-center gap-1.5 font-bold select-none text-[11px]">
              <User className="w-3.5 h-3.5 nm-text-dim" />
              <span className="nm-text-primary hidden sm:inline max-w-[120px] truncate">{currentUser.email}</span>
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
          className="nm-btn flex items-center justify-center p-2.5 rounded-full"
          title="Toggle Dark/Light Mode"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* Database Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs nm-text-dim font-mono">Database:</span>
          <div className="nm-badge flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className={connected ? 'text-emerald-500' : 'text-amber-500'}>
              {connected ? 'ONLINE' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
