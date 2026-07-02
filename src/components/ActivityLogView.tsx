import { useState } from 'react';
import { ShieldCheck, Search, Clock, Trash2, Calendar, User, FileClock, Filter, X } from 'lucide-react';

export interface ActivityLog {
  id: string;
  timestamp: number;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  category: string;
}

interface ActivityLogViewProps {
  logs: ActivityLog[];
  onClearAll?: () => void;
}

export default function ActivityLogView({ logs, onClearAll }: ActivityLogViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredLogs = logs.filter(log => {
    const matchSearch = search === '' || 
      log.actor?.toLowerCase().includes(search.toLowerCase()) || 
      log.action?.toLowerCase().includes(search.toLowerCase()) || 
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));
      
    const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
    
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categories = [
    { value: 'all', label: 'All Activities' },
    { value: 'auth', label: 'Authentication' },
    { value: 'alert', label: 'Alerts' },
    { value: 'config', label: 'System Config' },
    { value: 'user', label: 'User Management' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black nm-text-heading flex items-center gap-2">
            <FileClock className="w-5 h-5 text-indigo-500" />
            Activity Logs
          </h2>
          <p className="nm-text-dim text-xs mt-0.5">
            System audit trail showing {filteredLogs.length} matching entries
          </p>
        </div>
        
        {onClearAll && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear all activity logs? This action cannot be undone.")) {
                onClearAll();
              }
            }}
            className="nm-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Logs
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b border-dashed border-slate-700/20 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 nm-text-dim" />
          <input
            type="text"
            placeholder="Search activities, users, details..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-8 py-2 nm-inset outline-none text-xs nm-text-heading transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 nm-text-dim hover:text-rose-500">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 nm-text-dim hidden sm:block" />
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => { setCategoryFilter(c.value); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                categoryFilter === c.value ? 'nm-inset text-indigo-500' : 'nm-flat nm-text-dim hover:text-indigo-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="flex flex-col gap-3">
        {paginatedLogs.length === 0 ? (
          <div className="nm-card flex flex-col items-center justify-center py-12 text-center">
            <p className="nm-text-dim text-sm font-semibold">No activity logs found</p>
          </div>
        ) : (
          paginatedLogs.map(log => (
            <div key={log.id} className="nm-card p-4 transition-all duration-300 hover:-translate-y-0.5 border border-slate-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                <div className="flex items-start gap-3">
                  <div className={`nm-inset p-2 rounded-full shrink-0 ${
                    log.category === 'auth' ? 'text-blue-500' :
                    log.category === 'alert' ? 'text-amber-500' :
                    log.category === 'config' ? 'text-purple-500' :
                    log.category === 'user' ? 'text-emerald-500' : 'text-slate-500'
                  }`}>
                    {log.category === 'auth' ? <User className="w-4 h-4" /> :
                     log.category === 'alert' ? <ShieldCheck className="w-4 h-4" /> :
                     log.category === 'config' ? <Clock className="w-4 h-4" /> :
                     log.category === 'user' ? <User className="w-4 h-4" /> :
                     <FileClock className="w-4 h-4" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold nm-text-primary">{log.action}</span>
                      <span className="text-[9px] font-black uppercase nm-text-dim bg-slate-500/10 px-2 py-0.5 rounded-full">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-xs nm-text-dim">{log.details}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] nm-text-dim font-mono bg-slate-500/5 px-2 py-1 rounded">
                    <Calendar className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold">
                    <span className="nm-text-dim">By: </span>
                    <span className={
                      log.actorRole === 'admin' ? 'text-rose-500' :
                      log.actorRole === 'operator' ? 'text-indigo-500' : 'text-emerald-500'
                    }>{log.actor}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold nm-text-dim">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="nm-btn p-2 rounded-xl text-indigo-500 disabled:opacity-40">‹</button>
              <span className="text-xs font-black nm-text-heading px-2">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="nm-btn p-2 rounded-xl text-indigo-500 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
