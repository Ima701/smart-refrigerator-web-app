import { RefreshCw } from 'lucide-react';

export interface HistoryRecord {
  id: string;
  temp1: number | string;
  hum1: number | string;
  temp2: number | string;
  hum2: number | string;
  door1: string;
  door2: string;
  timestamp: string;
}

interface TrendAnalysisProps {
  history: HistoryRecord[];
}

export default function TrendAnalysis({ history }: TrendAnalysisProps) {
  return (
    <div className="max-w-7xl mx-auto mt-8 nm-card transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold nm-text-heading">📊 Database Trend Analysis</h2>
          <p className="text-xs nm-text-dim mt-1">Live synchronized Firestore historical values (Last 10 updates)</p>
        </div>
        <div className="nm-badge flex gap-4 text-[10px] font-mono select-none">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></span> Fridge 1 (Glacier)
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Fridge 2 (Aurora)
          </span>
        </div>
      </div>

      {/* Dynamic SVG representation with weather-themed background and colors */}
      <div className="nm-inset h-64 w-full p-4 relative overflow-hidden flex items-end shadow-inner">
        {history.length < 2 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center nm-text-dim gap-3 text-xs italic">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span>Waiting for ESP32 Firestore uploads...</span>
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="1000" y2="50" className="stroke-slate-700/10 dark:stroke-slate-700/30" strokeWidth="0.8" strokeDasharray="6,6" />
            <line x1="0" y1="100" x2="1000" y2="100" className="stroke-slate-700/10 dark:stroke-slate-700/30" strokeWidth="0.8" strokeDasharray="6,6" />
            <line x1="0" y1="150" x2="1000" y2="150" className="stroke-slate-700/10 dark:stroke-slate-700/30" strokeWidth="0.8" strokeDasharray="6,6" />

            {/* R1 Temp Polyline: Glacier Cyan (#06b6d4) */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={history.map((h, idx) => {
                const x = (idx / (history.length - 1)) * 1000;
                const y = 200 - (parseFloat(String(h.temp1)) * 12);
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* R2 Temp Polyline: Aurora Indigo (#6366f1) */}
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={history.map((h, idx) => {
                const x = (idx / (history.length - 1)) * 1000;
                const y = 200 - (parseFloat(String(h.temp2)) * 12);
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
