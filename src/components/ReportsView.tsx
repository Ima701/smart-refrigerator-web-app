import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  ComposedChart, Area,
  Line,
  CartesianGrid
} from 'recharts';
import { Download, Filter, TrendingUp, AlertTriangle, Activity, Clock, Users, Wifi } from 'lucide-react';

import { EventRecord } from './EventsView';
import { Incident } from './IncidentLogView';
import { ActivityLog } from './ActivityLogView';

interface ReportsViewProps {
  events: EventRecord[];
  incidents: Incident[];
  activityLogs: ActivityLog[];
}

type TimeFilter = '7d' | '30d' | 'all';

const COLORS = ['#06b6d4', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6'];

export default function ReportsView({ events, incidents, activityLogs }: ReportsViewProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // --- Filtering ---
  const filteredEvents = useMemo(() => {
    if (timeFilter === 'all') return events;
    const cutoff = Date.now() - (timeFilter === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return events.filter(e => e.timestamp >= cutoff);
  }, [events, timeFilter]);

  const filteredIncidents = useMemo(() => {
    if (timeFilter === 'all') return incidents;
    const cutoff = Date.now() - (timeFilter === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return incidents.filter(i => i.triggeredAt >= cutoff);
  }, [incidents, timeFilter]);

  const filteredLogs = useMemo(() => {
    if (timeFilter === 'all') return activityLogs;
    const cutoff = Date.now() - (timeFilter === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return activityLogs.filter(a => a.timestamp >= cutoff);
  }, [activityLogs, timeFilter]);

  // --- 1. Summary Dashboard Aggregations ---
  const summaryMetrics = useMemo(() => {
    const totalIncidents = filteredIncidents.length;
    const unresolvedIncidents = filteredIncidents.filter(i => i.status === 'active' || i.status === 'acknowledged').length;
    const totalEvents = filteredEvents.length;
    const avgResponseMs = filteredIncidents.reduce((acc, inc) => {
      const ackEvent = inc.timeline.find(t => t.action === 'ACKNOWLEDGED');
      if (ackEvent) return acc + (ackEvent.time - inc.triggeredAt);
      return acc;
    }, 0) / (filteredIncidents.filter(i => i.timeline.some(t => t.action === 'ACKNOWLEDGED')).length || 1);

    return {
      totalIncidents,
      unresolvedIncidents,
      totalEvents,
      avgResponseMin: (avgResponseMs / 60000).toFixed(1)
    };
  }, [filteredEvents, filteredIncidents]);

  // --- 1.5 System Uptime/Downtime Aggregations ---
  const uptimeMetrics = useMemo(() => {
    let totalDowntimeMs = 0;
    let outages = 0;

    filteredEvents.forEach(e => {
      if (e.type === 'CONNECTION_RESTORED' && (e as any).duration) {
        totalDowntimeMs += (e as any).duration;
        outages++;
      }
    });

    // For "all time", we default to 30 days as a reasonable baseline if we don't have the exact first event date.
    const periodDays = timeFilter === 'all' ? 30 : (timeFilter === '7d' ? 7 : 30);
    const totalPeriodMs = periodDays * 24 * 60 * 60 * 1000;

    const uptimePercent = Math.max(0, 100 - ((totalDowntimeMs / totalPeriodMs) * 100));
    const downtimeMins = (totalDowntimeMs / 60000).toFixed(1);

    return {
      uptimePercent: uptimePercent.toFixed(2),
      downtimeMins,
      outages
    };
  }, [filteredEvents, timeFilter]);

  // --- 2. Temp & Humid Trend (Mocked for historical ranges) ---
  const trendData = useMemo(() => {
    const now = Date.now();
    const days = timeFilter === 'all' || timeFilter === '30d' ? 30 : 7;
    return Array.from({ length: days }, (_, i) => {
      const t = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);

      // Pseudo-random deterministic value based on the day of the month so it doesn't jump on re-render
      const seed = t.getDate();
      const pseudoRandom1 = (Math.sin(seed) * 10000) % 1;
      const pseudoRandom2 = (Math.cos(seed) * 10000) % 1;
      const pseudoRandom3 = (Math.sin(seed + 5) * 10000) % 1;
      const pseudoRandom4 = (Math.cos(seed + 5) * 10000) % 1;

      return {
        date: t.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        f1TempAvg: parseFloat((-12 + Math.abs(pseudoRandom1) * 6).toFixed(1)),
        f2TempAvg: parseFloat((-14 + Math.abs(pseudoRandom2) * 5).toFixed(1)),
        f1HumAvg: parseFloat((55 + Math.abs(pseudoRandom3) * 15).toFixed(1)),
        f2HumAvg: parseFloat((50 + Math.abs(pseudoRandom4) * 15).toFixed(1)),
      };
    });
  }, [timeFilter]);

  // --- 2.5 Connectivity Health ---
  const connectivityData = useMemo(() => {
    const now = Date.now();
    const days = timeFilter === 'all' || timeFilter === '30d' ? 30 : 7;

    // Create bucket for each day
    const buckets: Record<string, { date: string; outages: number; durationMin: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const t = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = t.toLocaleDateString([], { month: 'short', day: 'numeric' });
      buckets[key] = { date: key, outages: 0, durationMin: 0 };
    }

    filteredEvents.forEach(e => {
      if (e.type === 'CONNECTION_RESTORED' && (e as any).duration) {
        const key = new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        if (buckets[key]) {
          buckets[key].outages += 1;
          buckets[key].durationMin += ((e as any).duration / 60000);
        }
      }
    });

    // Round durations
    return Object.values(buckets).map(b => ({
      ...b,
      durationMin: parseFloat(b.durationMin.toFixed(2))
    }));
  }, [filteredEvents, timeFilter]);

  // --- 3. Alert Frequency ---
  const frequencyData = useMemo(() => {
    const counts = filteredEvents.reduce((acc: any, ev) => {
      const key = ev.fridge || 'Unknown';
      if (!acc[key]) acc[key] = { name: key, Temp: 0, Humid: 0, Door: 0, Connection: 0, Total: 0 };
      if (ev.type && ev.type.includes('TEMP')) acc[key].Temp++;
      else if (ev.type && ev.type.includes('HUMID')) acc[key].Humid++;
      else if (ev.type && ev.type.includes('DOOR')) acc[key].Door++;
      else if (ev.type && ev.type.includes('CONNECTION')) acc[key].Connection++;
      acc[key].Total++;
      return acc;
    }, {});
    return Object.values(counts) as any[];
  }, [filteredEvents]);

  // --- 4. Equipment Health (Pie Chart) ---
  const healthData = useMemo(() => {
    const f1Alerts = filteredEvents.filter(e => e.fridge === 'Fridge1' || e.fridge === 'F1').length;
    const f2Alerts = filteredEvents.filter(e => e.fridge === 'Fridge2' || e.fridge === 'F2').length;
    const sysAlerts = filteredEvents.filter(e => e.fridge === 'system').length;
    return [
      { name: 'Fridge 1 Alerts', value: f1Alerts },
      { name: 'Fridge 2 Alerts', value: f2Alerts },
      { name: 'System Outages', value: sysAlerts }
    ].filter(d => d.value > 0);
  }, [filteredEvents]);

  // --- 5. Incident & Response (MTTA/MTTR) ---
  const responseData = useMemo(() => {
    return filteredIncidents.slice(0, 20).map((inc, i) => {
      const ackEvent = inc.timeline.find(t => t.action === 'ACKNOWLEDGED');
      const resEvent = inc.timeline.find(t => t.action === 'RESOLVED');

      const mtta = ackEvent ? (ackEvent.time - inc.triggeredAt) / 60000 : 0;
      const mttr = resEvent ? (resEvent.time - inc.triggeredAt) / 60000 : 0;

      return {
        id: `Inc ${filteredIncidents.length - i}`,
        MTTA: parseFloat(mtta.toFixed(1)),
        MTTR: parseFloat(mttr.toFixed(1))
      };
    });
  }, [filteredIncidents]);

  // --- 6. User Activity & Audit ---
  const auditData = useMemo(() => {
    const counts = filteredLogs.reduce((acc: any, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredLogs]);

  // --- Export Function ---
  const handleExport = () => {
    let csv = 'Report Summary\n';
    csv += `Total Incidents,${summaryMetrics.totalIncidents}\n`;
    csv += `Unresolved Incidents,${summaryMetrics.unresolvedIncidents}\n`;
    csv += `Total Raw Events,${summaryMetrics.totalEvents}\n`;
    csv += `Avg Response Time (mins),${summaryMetrics.avgResponseMin}\n\n`;

    csv += 'Alert Frequency by Device\n';
    csv += 'Device,Temp Alerts,Humid Alerts,Door Alerts,Connection Drops,Total\n';
    frequencyData.forEach(d => {
      csv += `${d.name},${d.Temp},${d.Humid},${d.Door},${d.Connection},${d.Total}\n`;
    });
    csv += '\n';

    csv += 'Connectivity Timeline\n';
    csv += 'Date,Outages,Downtime (mins)\n';
    connectivityData.forEach(d => {
      csv += `${d.date},${d.outages},${d.durationMin}\n`;
    });
    csv += '\n';

    csv += 'Activity Breakdown\n';
    csv += 'Category,Count\n';
    auditData.forEach(d => {
      csv += `${d.name},${d.value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smart-fridge-report-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Insight Generators ---
  const getFrequencyInsight = () => {
    if (frequencyData.length === 0) return "No events recorded in this time period.";
    const max = frequencyData.reduce((prev, current) => (prev.Total > current.Total) ? prev : current);
    return `${max.name} generated the most alerts (${max.Total}), representing ${Math.round((max.Total / Math.max(1, summaryMetrics.totalEvents)) * 100)}% of all system events.`;
  };

  const getHealthInsight = () => {
    const total = healthData.reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) return "All equipment is operating perfectly with zero recorded alerts.";
    const max = healthData.reduce((prev, current) => (prev.value > current.value) ? prev : current);
    return `${max.name} requires the most attention, accounting for ${Math.round((max.value / total) * 100)}% of all warnings.`;
  };

  const getConnectivityInsight = () => {
    if (connectivityData.length === 0) return "No data available.";
    const totalOutages = connectivityData.reduce((acc, curr) => acc + curr.outages, 0);
    const maxDay = connectivityData.reduce((prev, current) => (prev.durationMin > current.durationMin) ? prev : current, connectivityData[0]);
    if (totalOutages === 0) return "100% uptime with no recorded connection drops in this period.";
    return `Highest instability on ${maxDay.date} with ${maxDay.durationMin} mins of total downtime.`;
  };

  const getAuditInsight = () => {
    if (auditData.length === 0) return "No system activity recorded.";
    const max = auditData.reduce((prev, current) => (prev.value > current.value) ? prev : current);
    return `The most frequent system activity is '${max.name}' actions, making up ${Math.round((max.value / Math.max(1, filteredLogs.length)) * 100)}% of the audit trail.`;
  };

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="nm-card p-3 text-xs shadow-xl" style={{ background: 'var(--nm-bg)', border: '1px solid var(--nm-shadow-dark)' }}>
          <p className="font-black nm-text-dim mb-2 uppercase tracking-wider">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
              <span className="nm-text-dim">{p.name}:</span>
              <span className="font-black" style={{ color: p.color || p.fill }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-black nm-text-heading">Intelligence Hub</h2>
          <p className="text-xs nm-text-dim mt-0.5">Unified Analytics Dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 nm-text-dim mr-1" />
            {(['7d', '30d', 'all'] as TimeFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${timeFilter === f ? 'nm-inset text-indigo-500' : 'nm-flat nm-text-dim hover:text-indigo-400'
                  }`}
              >
                {f === 'all' ? 'All Time' : `Last ${f.replace('d', ' Days')}`}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="nm-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-indigo-500 mb-2">{summaryMetrics.totalIncidents}</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">Total Incidents</span>
        </div>
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-amber-500 mb-2">{summaryMetrics.unresolvedIncidents}</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">Unresolved</span>
        </div>
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-cyan-500 mb-2">{summaryMetrics.totalEvents}</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">Telemetry Events</span>
        </div>
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-emerald-500 mb-2">{summaryMetrics.avgResponseMin}m</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">Avg Response Time</span>
        </div>
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-blue-500 mb-2">{uptimeMetrics.uptimePercent}%</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">System Uptime</span>
        </div>
        <div className="nm-card p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-rose-500 mb-2">{uptimeMetrics.downtimeMins}m</span>
          <span className="text-xs font-bold nm-text-dim uppercase tracking-wider">Total Downtime</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Trend Chart (Spans 2 columns) */}
        <div className="nm-card flex flex-col lg:col-span-2 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">Temp & Humidity Trends</h3>
              <p className="text-[10px] nm-text-dim">Simulated daily trailing average</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> Temperature and Humidity trends appear stable across all units over the selected time period.
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nm-shadow-dark)" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} unit="°C" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={renderTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="f1TempAvg" name="F1 Avg Temp" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="f2TempAvg" name="F2 Avg Temp" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="f1HumAvg" name="F1 Avg Hum" stroke="#3b82f6" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="f2HumAvg" name="F2 Avg Hum" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency Chart (Spans 1 column) */}
        <div className="nm-card flex flex-col lg:col-span-1 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">Alert Frequency</h3>
              <p className="text-[10px] nm-text-dim">Breakdown by type and fridge</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> {getFrequencyInsight()}
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nm-shadow-dark)" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <Tooltip content={renderTooltip} cursor={{ fill: 'var(--nm-shadow-dark)', opacity: 0.1 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Temp" stackId="a" fill="#f43f5e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Humid" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Door" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Connection" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Health (Spans 1 column) */}
        <div className="nm-card flex flex-col lg:col-span-1 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">Equipment Health</h3>
              <p className="text-[10px] nm-text-dim">Alert ratio comparison</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> {getHealthInsight()}
          </div>
          <div className="flex-1 min-h-0 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="value" stroke="none">
                  {healthData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connectivity Health (Spans 2 columns) */}
        <div className="nm-card flex flex-col lg:col-span-2 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <Wifi className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">Connectivity Health</h3>
              <p className="text-[10px] nm-text-dim">Network stability and downtime duration</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> {getConnectivityInsight()}
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={connectivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nm-shadow-dark)" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} unit="m" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <Tooltip content={renderTooltip} cursor={{ fill: 'var(--nm-shadow-dark)', opacity: 0.1 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area yAxisId="left" type="monotone" dataKey="durationMin" name="Downtime (mins)" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                <Bar yAxisId="right" dataKey="outages" name="Outage Count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Times Chart (Spans 2 columns) */}
        <div className="nm-card flex flex-col lg:col-span-2 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">Operator Response Times</h3>
              <p className="text-[10px] nm-text-dim">MTTA and MTTR for recent incidents</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> Operator response time (MTTA) averages {summaryMetrics.avgResponseMin} minutes across the filtered incidents.
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nm-shadow-dark)" opacity={0.3} />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip content={renderTooltip} cursor={{ fill: 'var(--nm-shadow-dark)', opacity: 0.1 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="MTTA" name="Time to Ack (mins)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MTTR" name="Time to Resolve (mins)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit (Spans 1 column) */}
        <div className="nm-card flex flex-col lg:col-span-1 min-h-[400px]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dashed border-slate-700/20">
            <div className="nm-inset p-2 rounded-xl">
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-black nm-text-heading uppercase tracking-wider">User Activity & Audit</h3>
              <p className="text-[10px] nm-text-dim">System events and authentication logs</p>
            </div>
          </div>
          <div className="mb-4 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
            💡 <strong>Insight:</strong> {getAuditInsight()}
          </div>
          <div className="flex-1 min-h-0 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={auditData} cx="40%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="value" stroke="none">
                  {auditData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '13px', right: '15%' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
