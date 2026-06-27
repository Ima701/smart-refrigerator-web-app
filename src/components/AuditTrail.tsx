import { useState } from 'react';
import { FileClock, Download, Search, Calendar, X } from 'lucide-react';

export interface AuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  actorRole: 'admin' | 'operator' | 'viewer';
  action: string;
  details: string;
  category: 'user' | 'config' | 'auth' | 'alert';
}

interface AuditTrailProps {
  entries: AuditEntry[];
}

const categoryConfig = {
  user: { label: 'User', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  config: { label: 'Config', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  auth: { label: 'Auth', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  alert: { label: 'Alert', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
};

// Sample audit data for demo
const SAMPLE_ENTRIES: AuditEntry[] = [
  { id: '1', timestamp: Date.now() - 60000, actor: 'admin@gmail.com', actorRole: 'admin', action: 'Changed role', details: 'operator@example.com → Viewer', category: 'user' },
  { id: '2', timestamp: Date.now() - 300000, actor: 'admin@gmail.com', actorRole: 'admin', action: 'Updated threshold', details: 'Max Temp changed from 8.0°C to 9.5°C', category: 'config' },
  { id: '3', timestamp: Date.now() - 600000, actor: 'operator@example.com', actorRole: 'operator', action: 'User login', details: 'Successful login from web app', category: 'auth' },
  { id: '4', timestamp: Date.now() - 900000, actor: 'System', actorRole: 'admin', action: 'Alert triggered', details: 'Fridge 01 exceeded max temp threshold (9.2°C > 8.0°C)', category: 'alert' },
  { id: '5', timestamp: Date.now() - 1800000, actor: 'admin@gmail.com', actorRole: 'admin', action: 'Created user', details: 'New account: staff@company.com (Operator)', category: 'user' },
  { id: '6', timestamp: Date.now() - 3600000, actor: 'admin@gmail.com', actorRole: 'admin', action: 'Updated threshold', details: 'Max Humidity changed from 75% to 80%', category: 'config' },
  { id: '7', timestamp: Date.now() - 7200000, actor: 'admin@gmail.com', actorRole: 'admin', action: 'User login', details: 'Successful login from web app', category: 'auth' },
  { id: '8', timestamp: Date.now() - 86400000, actor: 'System', actorRole: 'admin', action: 'Alert triggered', details: 'Door D1 left open for more than 5 minutes', category: 'alert' },
];

export default function AuditTrail({ entries }: AuditTrailProps) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | keyof typeof categoryConfig>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const displayEntries = entries.length > 0 ? entries : SAMPLE_ENTRIES;

  const filtered = displayEntries.filter((e) => {
    const matchSearch = search === '' || e.actor.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()) || e.details.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchDate = dateFilter === '' || new Date(e.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    return matchSearch && matchCat && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const header = 'Timestamp,Actor,Role,Action,Details,Category';
    const rows = filtered.map((e) =>
      `"${new Date(e.timestamp).toLocaleString()}","${e.actor}","${e.actorRole}","${e.action}","${e.details}","${e.category}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="nm-card transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-700/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="nm-inset p-2 rounded-xl">
            <FileClock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-black nm-text-heading flex items-center gap-2">
              Audit Trail
              {entries.length === 0 && (
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Demo Data
                </span>
              )}
            </h2>
            <p className="text-xs nm-text-dim mt-0.5">{filtered.length} system events logged</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="nm-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 nm-text-dim" />
          <input
            type="text"
            placeholder="Search actor, action or details..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 nm-inset outline-none text-xs nm-text-heading transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 nm-text-dim hover:text-rose-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date filter */}
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 w-4 h-4 nm-text-dim pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            className="pl-9 pr-4 py-2.5 nm-inset outline-none text-xs nm-text-heading transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'user', 'config', 'auth', 'alert'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all duration-200 ${
                categoryFilter === cat
                  ? cat === 'all'
                    ? 'nm-inset text-amber-500'
                    : `nm-inset ${categoryConfig[cat as keyof typeof categoryConfig]?.color}`
                  : 'nm-flat nm-text-dim'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="nm-inset p-10 flex flex-col items-center justify-center text-center rounded-xl">
          <FileClock className="w-10 h-10 nm-text-dim mb-3 opacity-40" />
          <p className="nm-text-dim text-sm font-semibold">No audit entries match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] nm-text-dim font-black uppercase tracking-widest border-b border-slate-700/10">
                  <th className="text-left pb-3 pl-2">#</th>
                  <th className="text-left pb-3">Time</th>
                  <th className="text-left pb-3">Actor</th>
                  <th className="text-left pb-3">Action</th>
                  <th className="text-left pb-3">Details</th>
                  <th className="text-left pb-3">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                {paginated.map((entry, idx) => {
                  const cc = categoryConfig[entry.category];
                  return (
                    <tr key={entry.id} className="hover:bg-slate-500/5 transition-colors duration-150">
                      <td className="py-3 pl-2 text-xs nm-text-dim font-mono w-6">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3 text-xs nm-text-dim font-mono whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-semibold nm-text-primary break-all">{entry.actor}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-bold nm-text-heading whitespace-nowrap">{entry.action}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs nm-text-dim">{entry.details}</span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider border rounded-full px-2 py-0.5 ${cc.color}`}>
                          {cc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold nm-text-dim">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="nm-btn p-2 rounded-xl text-amber-500 disabled:opacity-50">
                  ‹
                </button>
                <span className="text-xs font-black nm-text-heading px-2">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="nm-btn p-2 rounded-xl text-amber-500 disabled:opacity-50">
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
