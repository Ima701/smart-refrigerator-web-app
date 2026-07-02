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
  maxHum: number;
}

type ChartMetric = 'temperature' | 'humidity';
type TimeRange = '12h' | '1d' | '3d' | '1w' | '1m' | '3m';

const TIME_RANGES: { value: TimeRange; label: string; points: number; hoursPerPoint: number }[] = [
  { value: '12h', label: '12hrs', points: 24, hoursPerPoint: 0.5 },
  { value: '1d', label: '1 Day', points: 24, hoursPerPoint: 1 },
  { value: '3d', label: '3 Days', points: 36, hoursPerPoint: 2 },
  { value: '1w', label: '1 Week', points: 42, hoursPerPoint: 4 },
  { value: '1m', label: '1 Month', points: 30, hoursPerPoint: 24 },
  { value: '3m', label: '3 Months', points: 45, hoursPerPoint: 48 }, // 1 point every 2 days for 3 months
];

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

export default function HistoryChart({ history, maxTemp, maxHum }: HistoryChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('temperature');
  const [range, setRange] = useState<TimeRange>('12h');

  const isEmpty = history.length === 0;
  const isShowingMock = isEmpty || !['12h', '1d'].includes(range);

  // Generate mock data if no real history exists yet, or adjust if range is large
  const displayData = useMemo(() => {
    // If we have real history and range is '24h'/'1d', show real history. 
    // Otherwise, real history is too short (since it only accumulates locally), so we show mock data for demo.
    if (history.length > 0 && (range === '12h' || range === '1d')) return history;

    const selectedRange = TIME_RANGES.find(r => r.value === range)!;
    const now = Date.now();

    return Array.from({ length: selectedRange.points }, (_, i) => {
      const t = new Date(now - (selectedRange.points - 1 - i) * selectedRange.hoursPerPoint * 60 * 60 * 1000);
      const seed = t.getTime();
      const pr1 = (Math.sin(seed / 1000) * 10000) % 1;
      const pr2 = (Math.cos(seed / 1000) * 10000) % 1;
      const pr3 = (Math.sin(seed / 500) * 10000) % 1;
      const pr4 = (Math.cos(seed / 500) * 10000) % 1;

      return {
        time: selectedRange.hoursPerPoint >= 24 
          ? t.toLocaleDateString([], { month: 'short', day: 'numeric' })
          : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        f1Temp: parseFloat((-12 + Math.abs(pr1) * 6).toFixed(1)),
        f2Temp: parseFloat((-14 + Math.abs(pr2) * 5).toFixed(1)),
        f1Hum: parseFloat((55 + Math.abs(pr3) * 15).toFixed(1)),
        f2Hum: parseFloat((50 + Math.abs(pr4) * 15).toFixed(1)),
      };
    });
  }, [history, range]);

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
              {isShowingMock ? `Sample data shown (${TIME_RANGES.find(r => r.value === range)?.label}) — connect live sensor for real history` : `Last ${TIME_RANGES.find(r => r.value === range)?.label} of live telemetry`}
            </p>
          </div>
        </div>

        {/* Time Range Selector & Metric Toggle */}
        <div className="flex flex-col sm:items-end gap-3">
          {/* Time Ranges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  range === r.value ? 'nm-inset text-indigo-500' : 'nm-flat nm-text-dim hover:text-indigo-400'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          
          {/* Metric Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMetric('temperature')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                isTemp ? 'nm-inset text-cyan-500' : 'nm-flat nm-text-dim hover:text-cyan-400'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" /> Temp
            </button>
            <button
              onClick={() => setMetric('humidity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                !isTemp ? 'nm-inset text-blue-500' : 'nm-flat nm-text-dim hover:text-blue-400'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" /> Humidity
            </button>
          </div>
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
              domain={['auto', (dataMax: number) => Math.max(dataMax, isTemp ? maxTemp + 2 : maxHum + 5)]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
              formatter={(val) => <span style={{ color: 'var(--nm-text-dim)' }}>{val}</span>}
            />
            {isTemp ? (
              <ReferenceLine
                y={maxTemp}
                stroke="#f43f5e"
                strokeDasharray="4 2"
                label={{ value: `⚠ ${maxTemp}°C limit`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
              />
            ) : (
              <ReferenceLine
                y={maxHum}
                stroke="#3b82f6"
                strokeDasharray="4 2"
                label={{ value: `⚠ ${maxHum}% limit`, fill: '#3b82f6', fontSize: 10, position: 'insideTopRight' }}
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
