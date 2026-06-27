import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  Eye,
  Wrench,
  Mail,
  Key,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserX,
  Edit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, onValue, set, remove } from 'firebase/database';
import { secondaryAuth, db } from '../firebase';
import type { UserRole } from '../store/authSlice';
import { useAppSelector } from '../store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ManagedUser {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// ---------------------------------------------------------------------------

const roleConfig: Record<UserRole, { label: string; color: string; Icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', Icon: ShieldCheck },
  operator: { label: 'Operator', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', Icon: Wrench },
  viewer: { label: 'Viewer', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', Icon: Eye },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function UserManagement() {
  const currentUser = useAppSelector((s) => s.auth.user);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Delete
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Ensure the current admin is persisted in /users on first load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;

    const adminRef = ref(db, `/users/${btoa(currentUser.email)}`);
    set(adminRef, {
      email: currentUser.email,
      role: currentUser.role,
      createdAt: new Date().toISOString().split('T')[0],
    }).catch(() => {/* silently ignore if already exists */ });
  }, [currentUser]);

  // ---------------------------------------------------------------------------
  // Subscribe to /users in RTDB — real-time list of all managed accounts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const usersRef = ref(db, '/users');
    const unsub = onValue(
      usersRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.val() as Record<string, Omit<ManagedUser, 'uid'>>;
          const list: ManagedUser[] = [];
          const seenEmails = new Set<string>();

          for (const [uid, data] of Object.entries(raw)) {
            if (!seenEmails.has(data.email)) {
              seenEmails.add(data.email);
              list.push({
                uid,
                email: data.email,
                role: data.role,
                createdAt: data.createdAt,
              });
            }
          }

          // Sort: admins first, then by email
          list.sort((a, b) => {
            const order: Record<UserRole, number> = { admin: 0, operator: 1, viewer: 2 };
            return order[a.role] - order[b.role] || a.email.localeCompare(b.email);
          });
          setUsers(list);
        } else {
          setUsers([]);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('UserManagement /users error:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ---------------------------------------------------------------------------
  // Add user — uses secondaryAuth so admin session is NEVER disturbed
  // ---------------------------------------------------------------------------
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      setModalError('Email and password are required.');
      return;
    }
    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');

    try {
      // Create in Firebase Auth via the secondary (isolated) app instance
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const role = newRole;
      const userEmail = cred.user.email ?? newEmail;
      const uid = btoa(userEmail); // stable, URL-safe key

      // Sign out from the secondary app immediately — we only needed it to create the account
      await signOut(secondaryAuth);

      // Persist to RTDB so UserManagement can list it
      await set(ref(db, `/users/${uid}`), {
        email: userEmail,
        role,
        createdAt: new Date().toISOString().split('T')[0],
      });

      setModalSuccess(`"${userEmail}" created as ${roleConfig[role].label}.`);
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setModalError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setModalError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setModalError('Please enter a valid email address.');
      } else {
        setModalError(err.message ?? 'Failed to create user.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete — removes the user record from RTDB
  // Note: Firebase client SDK cannot delete other users' Auth accounts.
  // ---------------------------------------------------------------------------
  const handleRemove = async (uid: string) => {
    setIsDeleting(true);
    try {
      await remove(ref(db, `/users/${uid}`));
    } catch (err) {
      console.error('Failed to remove user from RTDB:', err);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Update Role — changes the user's role in RTDB
  // ---------------------------------------------------------------------------
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingRole(true);
    try {
      await set(ref(db, `/users/${editingUser.uid}/role`), editRole);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const openAddModal = () => {
    setShowModal(true);
    setModalError('');
    setModalSuccess('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('viewer');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="nm-card mt-8 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-700/20 mb-2">
        <h2 className="text-xl font-bold nm-text-heading flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-500" /> User Management
          <span className="ml-1 nm-badge text-[10px] font-black text-rose-500 uppercase tracking-wider px-2 py-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        </h2>
        <button
          id="btn-add-user"
          onClick={openAddModal}
          className="nm-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-rose-500"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <p className="text-xs nm-text-dim mb-6 mt-3">
        All system accounts are listed here in real-time from the database. Roles determine access levels within the application.
      </p>

      {/* Loading state */}
      {isLoading ? (
        <div className="nm-inset p-10 flex flex-col items-center justify-center rounded-xl gap-3">
          <RefreshCw className="w-7 h-7 nm-text-dim animate-spin" />
          <p className="nm-text-dim text-xs font-semibold">Loading users from database…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="nm-inset p-10 flex flex-col items-center justify-center text-center rounded-xl">
          <UserX className="w-10 h-10 nm-text-dim mb-3 opacity-40" />
          <p className="nm-text-dim text-sm font-semibold">No users found in the database.</p>
          <p className="nm-text-dim text-xs mt-1">Click "Add User" to create the first account.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] nm-text-dim font-black uppercase tracking-widest border-b border-slate-700/10">
                  <th className="text-left pb-3 pl-2">#</th>
                  <th className="text-left pb-3">Email</th>
                  <th className="text-left pb-3">Role</th>
                  <th className="text-left pb-3">Joined</th>
                  <th className="text-right pb-3 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((u, idx) => {
                  const rc = roleConfig[u.role];
                  const RoleIcon = rc.Icon;
                  const isSelf = u.email === currentUser?.email;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-500/5 transition-colors duration-150">
                      {/* Index */}
                      <td className="py-3.5 pl-2 text-xs nm-text-dim font-mono w-6">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                    {/* Email */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="nm-inset p-1.5 rounded-full shrink-0">
                          <Mail className="w-3.5 h-3.5 nm-text-dim" />
                        </div>
                        <span className="font-semibold nm-text-primary text-xs break-all">{u.email}</span>
                        {isSelf && (
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider border rounded-full px-2.5 py-1 ${rc.color}`}>
                        <RoleIcon className="w-3 h-3" /> {rc.label}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="py-3.5 text-xs nm-text-dim font-mono whitespace-nowrap">{u.createdAt}</td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-right whitespace-nowrap">
                      {!isSelf && (
                        pendingDelete === u.uid ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] nm-text-dim">Remove?</span>
                            <button
                              onClick={() => handleRemove(u.uid)}
                              disabled={isDeleting}
                              className="text-[10px] font-black text-rose-500 hover:underline disabled:opacity-50"
                            >
                              {isDeleting ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setPendingDelete(null)}
                              className="text-[10px] font-black nm-text-dim hover:underline"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                              }}
                              title="Edit role"
                              className="nm-btn p-2 rounded-lg text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setPendingDelete(u.uid)}
                              title="Remove user"
                              className="nm-btn p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {Math.ceil(users.length / itemsPerPage) > 1 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold nm-text-dim">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="nm-btn p-2 rounded-xl text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black nm-text-heading px-2">
                  Page {currentPage} of {Math.ceil(users.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(users.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
                  className="nm-btn p-2 rounded-xl text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Add User Modal ===== */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="nm-card w-full max-w-sm p-7 relative">
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 nm-btn p-1.5 rounded-full nm-text-dim"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold nm-text-heading mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-500" /> Add New User
            </h3>
            <p className="text-xs nm-text-dim mb-5">
              Creates a Firebase Auth account and registers it in the system. Select a role for the new user.
            </p>

            {modalError && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {modalError}
              </div>
            )}
            {modalSuccess && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleAddUser} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Email</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 nm-text-dim" />
                  <input
                    id="new-user-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="operator@example.com"
                    className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Temporary Password</label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3 w-4 h-4 nm-text-dim" />
                  <input
                    id="new-user-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-3 nm-inset outline-none text-sm transition-all nm-text-heading"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([r, rc]) => {
                    const Icon = rc.Icon;
                    const isSelected = newRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRole(r)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-200 border ${
                          isSelected ? 'nm-inset border-transparent ' + rc.color : 'nm-flat border-transparent nm-text-dim hover:nm-text-primary hover:border-slate-400/20'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">{rc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                id="btn-create-user"
                type="submit"
                disabled={isSubmitting}
                className="nm-btn mt-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 text-rose-500"
              >
                {isSubmitting
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Create User</>}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== Edit Role Modal ===== */}
      {editingUser && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="nm-card w-full max-w-sm p-7 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 nm-btn p-1.5 rounded-full nm-text-dim"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold nm-text-heading mb-1 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-500" /> Edit User Role
            </h3>
            <p className="text-xs nm-text-dim mb-5">
              Change the system access level for <strong className="nm-text-primary">{editingUser.email}</strong>.
            </p>

            <form onSubmit={handleUpdateRole} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-xs nm-text-dim font-bold uppercase tracking-wider pl-1">Assign Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([r, rc]) => {
                    const Icon = rc.Icon;
                    const isSelected = editRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditRole(r)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-200 border ${
                          isSelected ? 'nm-inset border-transparent ' + rc.color : 'nm-flat border-transparent nm-text-dim hover:nm-text-primary hover:border-slate-400/20'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">{rc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingRole || editRole === editingUser.role}
                className="nm-btn mt-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 text-cyan-500 disabled:opacity-50"
              >
                {isUpdatingRole ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Role'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
