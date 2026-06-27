import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { TrendingUp, Thermometer, Droplets } from 'lucide-react';

interface HistoryPoint {
  time: string;
  f1Temp: number;
  f2Temp: number;
  f1Hum: number;
  f2Hum: number;
}

interface HistoryChartProps {
  history: HistoryPoint[];
  maxTemp: number;
}

type ChartMetric = 'temperature' | 'humidity';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="nm-card p-3 text-xs shadow-xl"
      style={{ background: 'var(--nm-bg)', border: '1px solid var(--nm-shadow-dark)' }}
    >
      <p className="font-black nm-text-dim mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="nm-text-dim">{p.name}:</span>
          <span className="font-black" style={{ color: p.color }}>{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryChart({ history, maxTemp }: HistoryChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('temperature');

  const isEmpty = history.length === 0;

  // Generate mock data if no real history exists yet
  const displayData = useMemo(() => {
    if (history.length > 0) return history;
    const now = Date.now();
    return Array.from({ length: 24 }, (_, i) => {
      const t = new Date(now - (23 - i) * 60 * 60 * 1000);
      return {
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        f1Temp: 4 + Math.random() * 6,
        f2Temp: 3 + Math.random() * 5,
        f1Hum: 55 + Math.random() * 25,
        f2Hum: 50 + Math.random() * 30,
      };
    });
  }, [history]);

  const isTemp = metric === 'temperature';

  return (
    <div className="nm-card transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-700/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="nm-inset p-2 rounded-xl">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-xl font-black nm-text-heading">Historical Trends</h2>
            <p className="text-xs nm-text-dim mt-0.5">
              {isEmpty ? 'Sample data shown — connect live sensor for real history' : 'Last 24 hours of telemetry'}
            </p>
          </div>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMetric('temperature')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              isTemp ? 'nm-inset text-cyan-500' : 'nm-flat nm-text-dim'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" /> Temp
          </button>
          <button
            onClick={() => setMetric('humidity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              !isTemp ? 'nm-inset text-blue-500' : 'nm-flat nm-text-dim'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" /> Humidity
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--nm-shadow-dark)" opacity={0.3} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--nm-text-dim)' }}
              tickLine={false}
              axisLine={false}
              unit={isTemp ? '°C' : '%'}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
              formatter={(val) => <span style={{ color: 'var(--nm-text-dim)' }}>{val}</span>}
            />
            {isTemp && (
              <ReferenceLine
                y={maxTemp}
                stroke="#f43f5e"
                strokeDasharray="4 2"
                label={{ value: `⚠ ${maxTemp}°C limit`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            {isTemp ? (
              <>
                <Line
                  type="monotone"
                  dataKey="f1Temp"
                  name="Fridge 01 Temp"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="f2Temp"
                  name="Fridge 02 Temp"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="f1Hum"
                  name="Fridge 01 Humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="f2Hum"
                  name="Fridge 02 Humidity"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {isEmpty && (
        <p className="text-center text-[10px] nm-text-dim mt-3 font-semibold">
          💡 Sample data shown. Real history will populate as your sensors report data.
        </p>
      )}
    </div>
  );
}
