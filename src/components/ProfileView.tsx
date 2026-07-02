import React, { useState } from 'react';
import { useAppSelector } from '../store';
import { auth, db } from '../firebase';
import { updateEmail, updatePassword } from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import { requestFCMToken } from '../services/fcmService';
import {
  User,
  Mail,
  Key,
  ShieldCheck,
  Wrench,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save,
  Bell,
  BellOff
} from 'lucide-react';
import type { UserRole } from '../store/authSlice';

const roleConfig: Record<UserRole, { label: string; color: string; Icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', Icon: ShieldCheck },
  operator: { label: 'Operator', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', Icon: Wrench },
  viewer: { label: 'Viewer', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', Icon: Eye },
};

export default function ProfileView() {
  const currentUser = useAppSelector((s) => s.auth.user);

  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted' && currentUser?.email) {
      await requestFCMToken(currentUser.email);
    }
  };

  if (!currentUser) return null;

  const rc = roleConfig[currentUser.role];
  const RoleIcon = rc.Icon;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Nothing changed
    if (newEmail === currentUser.email && !newPassword) {
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      let emailUpdated = false;

      // Update Email
      if (newEmail !== currentUser.email) {
        await updateEmail(auth.currentUser, newEmail);
        
        // Migrate database key to match new email
        const oldUid = currentUser.email.replace(/\./g, ',');
        const newUid = newEmail.replace(/\./g, ',');
        
        const oldRef = ref(db, `/users/${oldUid}`);
        const newRef = ref(db, `/users/${newUid}`);
        
        const snap = await get(oldRef);
        if (snap.exists()) {
          await set(newRef, { ...snap.val(), email: newEmail });
          await remove(oldRef);
        } else {
          // If for some reason they weren't in the database yet, add them
          await set(newRef, {
            email: newEmail,
            role: currentUser.role,
            createdAt: new Date().toISOString().split('T')[0],
          });
        }
        
        emailUpdated = true;
      }

      // Update Password
      let passwordUpdated = false;
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword(''); // Clear the field on success
        passwordUpdated = true;
      }

      setStatus('success');
      const msgs = [];
      if (emailUpdated) msgs.push('Email updated successfully');
      if (passwordUpdated) msgs.push('Password updated successfully');
      setMessage(msgs.join(' and ') + '!');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      
      if (err.code === 'auth/requires-recent-login') {
        setMessage('For your security, please log out and log back in before changing your email or password.');
      } else if (err.code === 'auth/invalid-email') {
        setMessage('The email address is improperly formatted.');
      } else if (err.code === 'auth/email-already-in-use') {
        setMessage('This email is already in use by another account.');
      } else if (err.code === 'auth/weak-password') {
        setMessage('Password should be at least 6 characters.');
      } else {
        setMessage(err.message || 'Failed to update profile.');
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="nm-card transition-all duration-300">
        <div className="flex items-center gap-3 pb-4 border-b border-dashed border-slate-700/20 mb-6">
          <div className="nm-inset p-2 rounded-xl">
            <User className="w-5 h-5 text-cyan-500" />
          </div>
          <h2 className="text-xl font-black nm-text-heading tracking-tight">Your Profile</h2>
        </div>

        <div className="mb-8">
          <p className="text-xs nm-text-dim mb-4">
            Current access level:
          </p>
          <div className="flex items-center gap-3 nm-inset p-4 rounded-xl">
            <div className={`p-2 rounded-full bg-opacity-20 ${rc.color.split(' ')[1]}`}>
              <RoleIcon className={`w-6 h-6 ${rc.color.split(' ')[0]}`} />
            </div>
            <div>
              <h3 className={`font-black uppercase tracking-wider text-sm ${rc.color.split(' ')[0]}`}>
                {rc.label}
              </h3>
              <p className="text-xs nm-text-dim mt-0.5">
                {currentUser.role === 'admin' && 'Full access to all system configurations and users.'}
                {currentUser.role === 'operator' && 'Can manage telemetry settings and acknowledge events.'}
                {currentUser.role === 'viewer' && 'Read-only access to dashboard and events.'}
              </p>
            </div>
          </div>
        </div>

        {status === 'error' && (
          <div className="flex items-start gap-2 mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex items-start gap-2 mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 nm-text-dim" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setStatus('idle');
                }}
                className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                disabled={status === 'loading'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">
              Change Password <span className="lowercase normal-case font-normal">(Leave blank to keep current)</span>
            </label>
            <div className="relative flex items-center">
              <Key className="absolute left-3 w-4 h-4 nm-text-dim" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setStatus('idle');
                }}
                placeholder="New password (min 6 characters)"
                className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                disabled={status === 'loading'}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="flex flex-col gap-2">
            <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Browser Alert Notifications</label>
            <div className="nm-inset px-4 py-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notifPermission === 'granted' ? (
                  <Bell className="w-5 h-5 text-emerald-500" />
                ) : (
                  <BellOff className="w-5 h-5 nm-text-dim" />
                )}
                <div>
                  <p className="text-xs font-bold nm-text-heading">
                    {notifPermission === 'granted' && 'Notifications Enabled'}
                    {notifPermission === 'denied' && 'Notifications Blocked'}
                    {notifPermission === 'default' && 'Notifications Off'}
                  </p>
                  <p className="text-[10px] nm-text-dim mt-0.5">
                    {notifPermission === 'granted' && 'You will get real-time alerts for temperature & door events.'}
                    {notifPermission === 'denied' && 'Blocked in browser settings. Allow notifications to enable.'}
                    {notifPermission === 'default' && 'Enable to receive alerts even when this tab is in the background.'}
                  </p>
                </div>
              </div>
              {notifPermission !== 'denied' && notifPermission !== 'granted' && (
                <button
                  onClick={requestNotifications}
                  type="button"
                  className="nm-btn px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500 whitespace-nowrap"
                >
                  Enable
                </button>
              )}
              {notifPermission === 'granted' && (
                <span className="nm-badge text-[10px] font-black uppercase text-emerald-500">Active</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'loading' || (newEmail === currentUser.email && !newPassword)}
              className="nm-btn w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 text-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Profile</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
