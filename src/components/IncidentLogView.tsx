import { useState } from 'react';
import {
  FileClock, ChevronDown, ChevronUp, Download, Search, Calendar,
  X, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Filter
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface IncidentTimelineEntry {
  time: number;
  action: string;
  actor: string;
  detail: string;
}

export interface Incident {
  id: string;
  type: string;           // e.g. TEMP_ALERT, HUMID_ALERT
  fridge: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: number;
  triggeredMessage: string;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  acknowledgedNote?: string;
  resolvedAt?: number;
  resolvedMessage?: string;
  timeline: IncidentTimelineEntry[];
}

interface IncidentLogViewProps {
  incidents: Incident[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const statusConfig = {
  active:       { label: 'Active',       color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',    dot: 'bg-rose-500 animate-pulse' },
  acknowledged: { label: 'Acknowledged', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500' },
  resolved:     { label: 'Resolved',     color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500' },
};

function typeLabel(type: string) {
  if (type.startsWith('TEMP'))  return '🌡️ Temperature';
  if (type.startsWith('HUMID')) return '💧 Humidity';
  if (type.startsWith('DOOR'))  return '🚪 Door';
  if (type.startsWith('LED'))   return '💡 LED';
  return type;
}

function fmt(ts: number) {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function duration(from: number, to: number) {
  const s = Math.floor((to - from) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ─────────────────────────────────────────────────────────────
// IncidentCard — single expandable incident
// ─────────────────────────────────────────────────────────────
function IncidentCard({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusConfig[incident.status];

  return (
    <div className="nm-card transition-all duration-300 overflow-hidden">
      {/* Header row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer select-none"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Status dot + badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${sc.color}`}>
            {sc.label}
          </span>
        </div>

        {/* Type + fridge */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black nm-text-heading flex items-center gap-2">
            {typeLabel(incident.type)}
            <span className="text-[10px] font-black nm-text-dim bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/10">
              {incident.fridge}
            </span>
          </p>
          <p className="text-xs nm-text-dim mt-0.5 truncate">{incident.triggeredMessage}</p>
        </div>

        {/* Meta times */}
        <div className="flex flex-col items-end gap-1 text-[10px] font-mono nm-text-dim shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Triggered: {fmt(incident.triggeredAt)}
          </span>
          {incident.resolvedAt && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3 h-3" />
              Resolved after {duration(incident.triggeredAt, incident.resolvedAt)}
            </span>
          )}
          {!incident.resolvedAt && incident.acknowledgedAt && (
            <span className="flex items-center gap-1 text-amber-500">
              <ShieldCheck className="w-3 h-3" />
              Ack'd: {fmt(incident.acknowledgedAt)}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button className="nm-btn p-1.5 rounded-lg nm-text-dim shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Timeline (expanded) */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-dashed border-slate-700/20">
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="nm-inset p-3 rounded-xl">
              <p className="text-[9px] nm-text-dim font-black uppercase tracking-wider mb-1">Triggered</p>
              <p className="text-xs font-black nm-text-heading">{fmt(incident.triggeredAt)}</p>
            </div>
            <div className="nm-inset p-3 rounded-xl">
              <p className="text-[9px] nm-text-dim font-black uppercase tracking-wider mb-1">Acknowledged By</p>
              <p className="text-xs font-black nm-text-heading truncate">
                {incident.acknowledgedBy ?? <span className="nm-text-dim italic">Pending</span>}
              </p>
            </div>
            <div className="nm-inset p-3 rounded-xl">
              <p className="text-[9px] nm-text-dim font-black uppercase tracking-wider mb-1">Resolved At</p>
              <p className="text-xs font-black nm-text-heading">
                {incident.resolvedAt ? fmt(incident.resolvedAt) : <span className="nm-text-dim italic">Not yet</span>}
              </p>
            </div>
            <div className="nm-inset p-3 rounded-xl">
              <p className="text-[9px] nm-text-dim font-black uppercase tracking-wider mb-1">Total Duration</p>
              <p className="text-xs font-black nm-text-heading">
                {incident.resolvedAt
                  ? duration(incident.triggeredAt, incident.resolvedAt)
                  : <span className="text-rose-500">Ongoing</span>}
              </p>
            </div>
          </div>

          {/* Operator note */}
          {incident.acknowledgedNote && (
            <div className="nm-inset p-3 rounded-xl mb-5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-500 mb-0.5">Operator Note</p>
                <p className="text-xs nm-text-heading">{incident.acknowledgedNote}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <p className="text-[9px] nm-text-dim font-black uppercase tracking-widest mb-3">Activity Timeline</p>
          <div className="flex flex-col gap-0">
            {incident.timeline.map((entry, i) => (
              <div key={i} className="flex gap-3">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                    entry.action.includes('triggered') ? 'bg-rose-500' :
                    entry.action.includes('cknowledg') ? 'bg-amber-500' :
                    entry.action.includes('esolv') || entry.action.includes('normal') ? 'bg-emerald-500' :
                    'bg-slate-400'
                  }`} />
                  {i < incident.timeline.length - 1 && (
                    <div className="w-px flex-1 bg-slate-500/20 my-1" />
                  )}
                </div>
                {/* Entry */}
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-xs font-black nm-text-heading">{entry.action}</span>
                    <span className="text-[10px] nm-text-dim font-mono">{fmt(entry.time)}</span>
                  </div>
                  <p className="text-xs nm-text-dim">
                    <span className="font-semibold nm-text-primary">{entry.actor}</span>
                    {entry.detail && ` — ${entry.detail}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main IncidentLogView
// ─────────────────────────────────────────────────────────────
export default function IncidentLogView({ incidents }: IncidentLogViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = incidents.filter(inc => {
    const matchStatus = statusFilter === 'all' || inc.status === statusFilter;
    const matchSearch = search === '' ||
      inc.fridge.toLowerCase().includes(search.toLowerCase()) ||
      inc.type.toLowerCase().includes(search.toLowerCase()) ||
      inc.triggeredMessage.toLowerCase().includes(search.toLowerCase()) ||
      (inc.acknowledgedBy ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (inc.acknowledgedNote ?? '').toLowerCase().includes(search.toLowerCase());
    const matchDate = dateFilter === '' ||
      new Date(inc.triggeredAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    return matchStatus && matchSearch && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const counts = {
    active:       incidents.filter(i => i.status === 'active').length,
    acknowledged: incidents.filter(i => i.status === 'acknowledged').length,
    resolved:     incidents.filter(i => i.status === 'resolved').length,
  };

  const handleExportCSV = () => {
    const header = 'ID,Fridge,Type,Status,Triggered At,Acknowledged By,Acknowledged Note,Resolved At,Duration,Triggered Message,Resolved Message';
    const rows = filtered.map(inc =>
      [
        inc.id,
        inc.fridge,
        inc.type,
        inc.status,
        new Date(inc.triggeredAt).toLocaleString(),
        inc.acknowledgedBy ?? '',
        inc.acknowledgedNote ?? '',
        inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : '',
        inc.resolvedAt ? duration(inc.triggeredAt, inc.resolvedAt) : 'Ongoing',
        `"${inc.triggeredMessage}"`,
        `"${inc.resolvedMessage ?? ''}"`,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="nm-card mt-8 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-700/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="nm-inset p-2 rounded-xl">
            <FileClock className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-black nm-text-heading">Incident Log</h2>
            <p className="text-xs nm-text-dim mt-0.5">{incidents.length} total incidents tracked</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="nm-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['active', 'acknowledged', 'resolved'] as const).map(s => {
          const sc = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(p => p === s ? 'all' : s); setCurrentPage(1); }}
              className={`nm-inset p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${statusFilter === s ? 'ring-1 ring-current ' + sc.color : ''}`}
            >
              <span className={`text-lg font-black ${sc.color.split(' ')[0]}`}>{counts[s]}</span>
              <span className="text-[9px] font-black uppercase tracking-wider nm-text-dim">{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 nm-text-dim" />
          <input
            type="text"
            placeholder="Search fridge, type, message, operator..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 nm-inset outline-none text-xs nm-text-heading transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 nm-text-dim hover:text-rose-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative flex items-center">
          <Calendar className="absolute left-3 w-4 h-4 nm-text-dim pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
            className="pl-9 pr-4 py-2.5 nm-inset outline-none text-xs nm-text-heading transition-all"
          />
        </div>
        {(statusFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => { setStatusFilter('all'); setDateFilter(''); setCurrentPage(1); }}
            className="nm-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-rose-500"
          >
            <Filter className="w-3.5 h-3.5" /> Clear Filters
          </button>
        )}
      </div>

      {/* Results */}
      {paginated.length === 0 ? (
        <div className="nm-inset p-12 flex flex-col items-center justify-center text-center rounded-xl">
          <AlertTriangle className="w-10 h-10 nm-text-dim mb-3 opacity-30" />
          <p className="nm-text-dim text-sm font-semibold">No incidents found.</p>
          <p className="nm-text-dim text-xs mt-1">Alerts from the IoT sensors will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginated.map(inc => <IncidentCard key={inc.id} incident={inc} />)}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold nm-text-dim">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="nm-btn p-2 rounded-xl text-rose-500 disabled:opacity-40">‹</button>
                <span className="text-xs font-black nm-text-heading px-2">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="nm-btn p-2 rounded-xl text-rose-500 disabled:opacity-40">›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
