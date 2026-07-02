import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, DoorOpen, Lightbulb, Clock, ShieldAlert,
  Filter, ChevronLeft, ChevronRight, CheckCircle2, Download, Search, Calendar, X, Droplets
} from 'lucide-react';

export interface EventRecord {
  id: string;
  type: string;       // e.g. TEMP_ALERT | DOOR_ALERT | LED_CHANGE
  fridge?: string;
  message: string;
  timestamp: number;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  note?: string;
}

type FilterType = 'all' | 'TEMP' | 'HUMID' | 'DOOR' | 'LED';
type StatusFilterType = 'active' | 'acknowledged';

interface EventsViewProps {
  events: EventRecord[];
  canView: boolean;
  currentUserRole?: string;
  onAcknowledge?: (id: string, note?: string) => void;
  onDeleteEvent?: (id: string) => void;
  onClearAll?: () => void;
}

function getEventIcon(type: string) {
  if (type.startsWith('TEMP')) return <AlertTriangle className="w-4 h-4 text-rose-500" />;
  if (type.startsWith('HUMID')) return <Droplets className="w-4 h-4 text-blue-500" />;
  if (type.startsWith('DOOR')) return <DoorOpen className="w-4 h-4 text-amber-500" />;
  if (type.startsWith('LED'))  return <Lightbulb className="w-4 h-4 text-yellow-500" />;
  return <Clock className="w-4 h-4 nm-text-dim" />;
}

function getEventAccent(type: string, acknowledged?: boolean): string {
  if (acknowledged) return 'border-emerald-500/20 bg-emerald-500/5 opacity-70';
  if (type.startsWith('TEMP')) return 'border-rose-500/40 bg-rose-500/5';
  if (type.startsWith('HUMID')) return 'border-blue-500/40 bg-blue-500/5';
  if (type.startsWith('DOOR')) return 'border-amber-500/40 bg-amber-500/5';
  if (type.startsWith('LED'))  return 'border-yellow-500/40 bg-yellow-500/5';
  return 'border-slate-500/20';
}

export default function EventsView({
  events,
  canView,
  currentUserRole,
  onAcknowledge,
  onDeleteEvent,
  onClearAll
}: EventsViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const itemsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [filter, statusFilter, search, dateFilter]);

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
    { label: '💧 Humidity', value: 'HUMID' },
    { label: '🚪 Door',    value: 'DOOR' },
    { label: '💡 LED',     value: 'LED' },
  ];

  const filtered = useMemo(() => {
    const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return events.filter((e) => {
      // Role-based visibility check: operators & viewers see last 3 months only
      const matchAge = currentUserRole === 'admin' || e.timestamp >= threeMonthsAgo;
      
      const matchType = filter === 'all' || e.type.startsWith(filter);
      const matchSearch = search === '' || e.message.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase());
      const matchDate = dateFilter === '' || new Date(e.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
      
      // Status filtering tab
      const matchStatus = statusFilter === 'active' ? !e.acknowledged : !!e.acknowledged;

      return matchAge && matchType && matchSearch && matchDate && matchStatus;
    });
  }, [events, filter, statusFilter, search, dateFilter, currentUserRole]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = events.filter(e => !e.acknowledged).length;
  const ackCount = events.filter(e => e.acknowledged).length;

  const handleExportCSV = () => {
    const header = 'Timestamp,Type,Fridge,Message,Acknowledged,AcknowledgedBy,Note';
    const rows = filtered.map((e) =>
      `"${new Date(e.timestamp).toLocaleString()}","${e.type}","${e.fridge || '-'}","${e.message}","${e.acknowledged ? 'Yes' : 'No'}","${e.acknowledgedBy || '-'}","${e.note || '-'}"`
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
              Event Timeline Center
            </h2>
            <p className="nm-text-dim text-xs mt-0.5">
              Showing {filtered.length} total events matching criteria {currentUserRole !== 'admin' && '(showing last 3 months)'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export */}
            <button
              onClick={handleExportCSV}
              className="nm-btn flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500 hover:bg-emerald-500/5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>

            {/* Clear All Logs (Admin only) */}
            {currentUserRole === 'admin' && onClearAll && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete all historical logs? This action is irreversible.")) {
                    onClearAll();
                  }
                }}
                className="nm-btn flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/5 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-500" /> Clear All Logs
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex gap-4 border-b border-dashed border-slate-700/20 pb-0 mb-2">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              statusFilter === 'active'
                ? 'border-indigo-500 text-indigo-500 font-bold'
                : 'border-transparent nm-text-dim hover:text-indigo-400'
            }`}
          >
            Active Alerts & System Logs ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('acknowledged')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              statusFilter === 'acknowledged'
                ? 'border-emerald-500 text-emerald-500 font-bold'
                : 'border-transparent nm-text-dim hover:text-emerald-400'
            }`}
          >
            Acknowledged Alerts ({ackCount})
          </button>
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

      {/* Timeline Cards List */}
      {paginated.length === 0 ? (
        <div className="nm-card flex flex-col items-center justify-center py-16 text-center">
          <div className="nm-inset p-4 rounded-full mb-4 nm-text-dim">
            <Clock className="w-8 h-8 animate-pulse opacity-40" />
          </div>
          <p className="nm-text-dim text-sm font-semibold">No events found in this category</p>
          <p className="nm-text-dim text-xs mt-1 opacity-60">
            {filter !== 'all' || search || dateFilter
              ? 'Try adjusting your search filters.'
              : 'This event log queue is currently empty.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginated.map((ev, idx) => (
            <div
              key={ev.id}
              className={`nm-card border ${getEventAccent(ev.type, ev.acknowledged)} transition-all duration-300 hover:-translate-y-0.5 p-4`}
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                
                {/* Left: Icon + Text Content */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="nm-inset p-2.5 rounded-full flex-shrink-0">
                    {ev.acknowledged
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : getEventIcon(ev.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-widest nm-text-dim bg-slate-500/15 px-2.5 py-0.5 rounded-md">
                        {ev.type}
                        {ev.fridge && <span className="ml-1 text-indigo-400 font-bold">· {ev.fridge}</span>}
                      </span>
                      <span className="text-[9px] nm-text-dim font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm nm-text-primary font-semibold leading-snug">{ev.message}</p>
                    {ev.note && (
                      <p className="text-[11px] text-emerald-600 font-bold mt-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block">
                        Note: {ev.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex-shrink-0 flex items-center gap-3 flex-wrap">
                  {ev.acknowledged ? (
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      ✓ Resolved by {ev.acknowledgedBy}
                    </span>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full mt-2 sm:mt-0">
                      {(ev.type.endsWith('_ALERT') || ev.type.endsWith('_REMINDER')) && onAcknowledge && (
                        <>
                          <input
                            type="text"
                            placeholder="Note (Problem & Action taken)..."
                            value={notes[ev.id] || ''}
                            onChange={(e) => setNotes(prev => ({ ...prev, [ev.id]: e.target.value }))}
                            className="px-2.5 py-1.5 text-xs nm-inset outline-none rounded-lg border border-slate-700/10 w-full sm:w-[250px] focus:border-indigo-500/50"
                          />
                          <button
                            disabled={!notes[ev.id]?.trim()}
                            onClick={() => {
                              if (!notes[ev.id]?.trim()) {
                                alert('Please note the problem and action taken before acknowledging.');
                                return;
                              }
                              onAcknowledge(ev.id, notes[ev.id]);
                            }}
                            className="nm-btn text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500/10 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Acknowledge
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Delete Button (Admin only) */}
                  {currentUserRole === 'admin' && onDeleteEvent && (
                    <button
                      onClick={() => onDeleteEvent(ev.id)}
                      className="nm-btn text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                      title="Delete Event Record"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" /> Delete
                    </button>
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
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(v => v - 1)}
                  className="nm-btn p-2 rounded-xl disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(v => v + 1)}
                  className="nm-btn p-2 rounded-xl disabled:opacity-40"
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
