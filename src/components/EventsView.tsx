import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, DoorOpen, Lightbulb, Clock, ShieldAlert,
  Filter, ChevronLeft, ChevronRight, CheckCircle2, Download, Search, Calendar, X
} from 'lucide-react';

export interface EventRecord {
  id: string;
  type: string;       // e.g. TEMP_ALERT | DOOR_ALERT | LED_CHANGE
  fridge?: string;
  message: string;
  timestamp: number;
  acknowledged?: boolean;
  acknowledgedBy?: string;
}

type FilterType = 'all' | 'TEMP' | 'DOOR' | 'LED';

interface EventsViewProps {
  events: EventRecord[];
  canView: boolean;
  currentUserEmail?: string;
  onAcknowledge?: (id: string) => void;
}

function getEventIcon(type: string) {
  if (type.startsWith('TEMP')) return <AlertTriangle className="w-4 h-4 text-rose-500" />;
  if (type.startsWith('DOOR')) return <DoorOpen className="w-4 h-4 text-amber-500" />;
  if (type.startsWith('LED'))  return <Lightbulb className="w-4 h-4 text-yellow-500" />;
  return <Clock className="w-4 h-4 nm-text-dim" />;
}

function getEventAccent(type: string, acknowledged?: boolean): string {
  if (acknowledged) return 'border-emerald-500/20 bg-emerald-500/5 opacity-70';
  if (type.startsWith('TEMP')) return 'border-rose-500/40 bg-rose-500/5';
  if (type.startsWith('DOOR')) return 'border-amber-500/40 bg-amber-500/5';
  if (type.startsWith('LED'))  return 'border-yellow-500/40 bg-yellow-500/5';
  return 'border-slate-500/20';
}

export default function EventsView({ events, canView, onAcknowledge }: EventsViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const itemsPerPage = 6;

  useEffect(() => { setCurrentPage(1); }, [filter, search, dateFilter, showAcknowledged]);

  // Access guard for viewers
  if (!canView) {
    return (
      <div className="nm-card flex flex-col items-center justify-center p-16 text-center">
        <div className="nm-inset p-5 rounded-full mb-4 text-rose-500">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>
        <h2 className="font-black text-xl nm-text-heading">Event Logs Locked</h2>
        <p className="text-sm nm-text-dim mt-2 max-w-xs leading-relaxed">
          You need Operator or Admin access to view the system event timeline.
        </p>
      </div>
    );
  }

  const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'All Events', value: 'all' },
    { label: '🌡 Temp',    value: 'TEMP' },
    { label: '🚪 Door',    value: 'DOOR' },
    { label: '💡 LED',     value: 'LED' },
  ];

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchType = filter === 'all' || e.type.startsWith(filter);
      const matchSearch = search === '' || e.message.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase());
      const matchDate = dateFilter === '' || new Date(e.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
      const matchAck = showAcknowledged || !e.acknowledged;
      return matchType && matchSearch && matchDate && matchAck;
    });
  }, [events, filter, search, dateFilter, showAcknowledged]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const unacknowledgedCount = events.filter(e => !e.acknowledged && (e.type.startsWith('TEMP') || e.type.startsWith('DOOR'))).length;

  const handleExportCSV = () => {
    const header = 'Timestamp,Type,Fridge,Message,Acknowledged,AcknowledgedBy';
    const rows = filtered.map((e) =>
      `"${new Date(e.timestamp).toLocaleString()}","${e.type}","${e.fridge || '-'}","${e.message}","${e.acknowledged ? 'Yes' : 'No'}","${e.acknowledgedBy || '-'}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header + Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black nm-text-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Event Timeline
              {unacknowledgedCount > 0 && (
                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  {unacknowledgedCount} unresolved
                </span>
              )}
            </h2>
            <p className="nm-text-dim text-xs mt-0.5">{events.length} total events</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExportCSV}
              className="nm-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Search + Date + Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 nm-text-dim" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 nm-inset outline-none text-xs nm-text-heading transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 nm-text-dim hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-3.5 h-3.5 nm-text-dim pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-3 py-2 nm-inset outline-none text-xs nm-text-heading transition-all"
            />
          </div>

          {/* Ack toggle */}
          <button
            onClick={() => setShowAcknowledged(v => !v)}
            className={`text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-200 ${showAcknowledged ? 'nm-inset text-emerald-500' : 'nm-flat nm-text-dim'}`}
          >
            {showAcknowledged ? '✓ Show Acknowledged' : 'Hide Acknowledged'}
          </button>

          {/* Type filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 nm-text-dim flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                id={`filter-${f.value}`}
                onClick={() => setFilter(f.value)}
                className={`nm-btn text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  filter === f.value ? 'nm-inset text-indigo-500' : 'nm-text-dim'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Cards */}
      {filtered.length === 0 ? (
        <div className="nm-card flex flex-col items-center justify-center py-16 text-center">
          <div className="nm-inset p-4 rounded-full mb-4 nm-text-dim">
            <Clock className="w-8 h-8 animate-pulse opacity-40" />
          </div>
          <p className="nm-text-dim text-sm font-semibold">No events found</p>
          <p className="nm-text-dim text-xs mt-1 opacity-60">
            {filter !== 'all' || search || dateFilter
              ? 'Try adjusting your search or filters.'
              : 'The /events node is empty or not yet written.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginated.map((ev, idx) => (
            <div
              key={ev.id}
              className={`nm-card border ${getEventAccent(ev.type, ev.acknowledged)} transition-all duration-300 hover:-translate-y-0.5`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon Badge */}
                <div className="nm-inset p-2.5 rounded-full flex-shrink-0">
                  {ev.acknowledged
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : getEventIcon(ev.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest nm-text-dim bg-slate-500/10 px-2 py-0.5 rounded-md">
                      {ev.type}
                      {ev.fridge && <span className="ml-1 text-indigo-400">· {ev.fridge}</span>}
                    </span>
                    <span className="text-[10px] nm-text-dim font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm nm-text-primary font-semibold leading-snug">{ev.message}</p>

                  {/* Acknowledged state or Acknowledge button */}
                  {ev.acknowledged ? (
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1.5">
                      ✓ Resolved by {ev.acknowledgedBy}
                    </p>
                  ) : (
                    (ev.type.startsWith('TEMP') || ev.type.startsWith('DOOR')) && onAcknowledge && (
                      <button
                        onClick={() => onAcknowledge(ev.id)}
                        className="mt-2 nm-btn text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Acknowledge
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-bold nm-text-dim">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} events
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="nm-btn p-2 rounded-xl text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black nm-text-heading px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="nm-btn p-2 rounded-xl text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
