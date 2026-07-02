import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { Shield, Key, Mail, Sun, Moon } from 'lucide-react';
import { auth, db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store';
import { setUser, setLoading, getRoleFromEmail } from '../store/authSlice';
import { toggleTheme } from '../store/themeSlice';

export default function Login() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    dispatch(setLoading(true));
    setErrorMsg('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = credential.user.email || email;
      setEmail('');
      setPassword('');
      const role = getRoleFromEmail(userEmail);
      dispatch(setUser({ email: userEmail, role }));
      
      // Log authentication
      push(ref(db, '/audit'), {
        timestamp: Date.now(),
        actor: userEmail,
        actorRole: role,
        action: 'User Logged In',
        details: 'Successful authentication into the system',
        category: 'auth',
      }).catch(err => console.error('Failed to write audit log:', err));
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMsg('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many attempts. Please try again later.');
      } else if (err.code === 'auth/user-disabled') {
        setErrorMsg('This account has been disabled. Contact your administrator.');
      } else {
        setErrorMsg(err.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="nm-btn flex items-center justify-center p-2.5 rounded-full"
          title="Toggle Dark/Light Mode"
        >
          {themeMode === 'dark'
            ? <Sun className="w-5 h-5 text-amber-400" />
            : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>
      </div>

      <div className="w-full max-w-md nm-card relative z-10 p-8 flex flex-col items-center">
        {/* Icon */}
        <div className="nm-inset p-4 rounded-full mb-6">
          <Shield className="w-10 h-10 text-cyan-500 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black nm-text-heading text-center">
          Smart Fridge System
        </h2>
        <p className="nm-text-dim text-xs text-center mt-1 mb-6 uppercase tracking-wider font-bold">
          Secure Sign In
        </p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignIn} className="w-full flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 nm-text-dim" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Password</label>
            <div className="relative flex items-center">
              <Key className="absolute left-3 w-4 h-4 nm-text-dim" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="nm-btn mt-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-[10px] nm-text-dim text-center leading-relaxed">
          Don't have an account? Contact your&nbsp;
          <span className="text-rose-500 font-bold">administrator</span>
          &nbsp;to get access.
        </p>
      </div>
    </div>
  );
}
