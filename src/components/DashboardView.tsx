import { useState, useEffect } from 'react';
import { Thermometer, Droplets, DoorClosed, DoorOpen, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import HistoryChart from './HistoryChart';

export interface LiveData {
  fridge1: {
    temp: number;
    hum: number;
  };
  fridge2: {
    temp: number;
    hum: number;
  };
  doors: {
    d1: number;
    d2: number;
  };
  led: boolean;
  updatedAt: number;
}

interface DashboardViewProps {
  liveData: LiveData | null;
  maxTemp?: number;
}

export default function DashboardView({ liveData, maxTemp = 8 }: DashboardViewProps) {
  const [history, setHistory] = useState<Array<{
    time: string; f1Temp: number; f2Temp: number; f1Hum: number; f2Hum: number;
  }>>([]);

  // Accumulate history data points from live sensor readings
  useEffect(() => {
    if (!liveData) return;
    const point = {
      // Use full timestamp-based label so multiple readings per minute are all captured
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      f1Temp: liveData.fridge1.temp,
      f2Temp: liveData.fridge2.temp,
      f1Hum: liveData.fridge1.hum,
      f2Hum: liveData.fridge2.hum,
      _ts: liveData.updatedAt ?? Date.now(), // deduplicate by the sensor's own timestamp
    };
    setHistory(prev => {
      // Only skip if this exact sensor timestamp was already recorded
      const last = prev[prev.length - 1] as typeof point | undefined;
      if (last && (last as any)._ts === point._ts) return prev;
      return [...prev.slice(-47), point];
    });
  }, [liveData]);
  if (!liveData) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="nm-inset p-6 rounded-full mb-4 animate-pulse">
          <Thermometer className="w-12 h-12 text-blue-500" />
        </div>
        <p className="nm-text-dim text-sm font-semibold">Subscribing to Realtime Database /live state...</p>
      </div>
    );
  }

  const { fridge1, fridge2, doors, led, updatedAt } = liveData;

  // Temperature Threshold Check — use configurable maxTemp from Redux, not hardcoded 8
  const f1Alert = fridge1.temp > maxTemp;
  const f2Alert = fridge2.temp > maxTemp;

  // Door Open checks
  const isD1Open = doors.d1 === 1;
  const isD2Open = doors.d2 === 1;

  // Curated premium design system styles (Gradients and borders)
  let f1AccentClass = "bg-gradient-to-r from-cyan-500 to-teal-400";
  let f1BorderClass = "";
  if (f1Alert) {
    f1AccentClass = "bg-gradient-to-r from-orange-500 via-rose-500 to-red-600";
    f1BorderClass = "ring-2 ring-rose-500/40";
  } else if (isD1Open) {
    f1AccentClass = "bg-gradient-to-r from-amber-400 to-orange-500";
    f1BorderClass = "ring-2 ring-amber-500/40";
  }

  let f2AccentClass = "bg-gradient-to-r from-violet-500 to-indigo-400";
  let f2BorderClass = "";
  if (f2Alert) {
    f2AccentClass = "bg-gradient-to-r from-orange-500 via-rose-500 to-red-600";
    f2BorderClass = "ring-2 ring-rose-500/40";
  } else if (isD2Open) {
    f2AccentClass = "bg-gradient-to-r from-amber-400 to-orange-500";
    f2BorderClass = "ring-2 ring-amber-500/40";
  }

  const hasTempAlert = f1Alert || f2Alert;
  const hasDoorAlert = isD1Open || isD2Open;
  let sysAccentClass = "bg-gradient-to-r from-emerald-500 to-teal-500";
  if (hasTempAlert) {
    sysAccentClass = "bg-gradient-to-r from-orange-500 via-rose-500 to-red-600";
  } else if (hasDoorAlert) {
    sysAccentClass = "bg-gradient-to-r from-amber-400 to-orange-500";
  }

  // Render Human-Readable Date
  const lastUpdated = updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'N/A';

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Dynamic Summary Info bar */}
      <div className="flex justify-between items-center text-xs nm-text-dim px-4">
        <span>Live updates streaming instantly</span>
        <span className="font-mono">Last Cloud Sync: {lastUpdated}</span>
      </div>

      {/* Grid: Fridge Units & Door/LED Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ================= FRIDGE 01 CARD ================= */}
        <div className={`nm-card relative overflow-hidden transition-all duration-300 ${f1BorderClass}`}>
          {/* Top side accent indicator */}
          <div className={`absolute top-0 left-0 h-2.5 w-full ${f1AccentClass}`}></div>

          <div className="flex justify-between items-start mb-6 pt-2">
            <div>
              <h2 className="text-xl font-bold nm-text-heading">Fridge Unit 01</h2>
              <span className="text-[10px] nm-text-dim font-bold uppercase tracking-wider">Upper Compartment</span>
            </div>
            {f1Alert ? (
              <span className="nm-badge inline-flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-wider bg-rose-500/10">
                <AlertTriangle className="w-3.5 h-3.5" /> High Temp Alert
              </span>
            ) : isD1Open ? (
              <span className="nm-badge inline-flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-wider bg-rose-500/10 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> Close Door
              </span>
            ) : (
              <span className="nm-badge inline-flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" /> Safe
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Temperature Panel */}
            <div className="nm-inset p-3 flex flex-col items-center">
              <Thermometer className={`w-6 h-6 mb-1.5 ${f1Alert ? 'text-rose-500 animate-bounce' : 'text-cyan-500'}`} />
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Temp</span>
              <span className={`text-2xl font-black mt-0.5 ${f1Alert ? 'text-rose-500' : 'text-cyan-500'}`}>
                {fridge1.temp.toFixed(1)}°C
              </span>
            </div>
            {/* Humidity Panel */}
            <div className="nm-inset p-3 flex flex-col items-center">
              <Droplets className="w-6 h-6 mb-1.5 text-blue-500" />
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Humidity</span>
              <span className="text-2xl font-black mt-0.5 text-blue-500">
                {fridge1.hum.toFixed(1)}%
              </span>
            </div>
            {/* Door Panel */}
            <div className={`nm-inset p-3 flex flex-col items-center transition-colors duration-300 ${isD1Open ? 'bg-rose-500/5' : ''}`}>
              {isD1Open ? (
                <DoorOpen className="w-6 h-6 mb-1.5 text-rose-500 animate-pulse" />
              ) : (
                <DoorClosed className="w-6 h-6 mb-1.5 text-emerald-500" />
              )}
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Door</span>
              <span className={`text-2xl font-black mt-0.5 ${isD1Open ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isD1Open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>
        </div>

        {/* ================= FRIDGE 02 CARD ================= */}
        <div className={`nm-card relative overflow-hidden transition-all duration-300 ${f2BorderClass}`}>
          {/* Top side accent indicator */}
          <div className={`absolute top-0 left-0 h-2.5 w-full ${f2AccentClass}`}></div>

          <div className="flex justify-between items-start mb-6 pt-2">
            <div>
              <h2 className="text-xl font-bold nm-text-heading">Fridge Unit 02</h2>
              <span className="text-[10px] nm-text-dim font-bold uppercase tracking-wider">Lower Compartment</span>
            </div>
            {f2Alert ? (
              <span className="nm-badge inline-flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-wider bg-rose-500/10">
                <AlertTriangle className="w-3.5 h-3.5" /> High Temp Alert
              </span>
            ) : isD2Open ? (
              <span className="nm-badge inline-flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-wider bg-rose-500/10 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> Close Door
              </span>
            ) : (
              <span className="nm-badge inline-flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" /> Safe
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Temperature Panel */}
            <div className="nm-inset p-3 flex flex-col items-center">
              <Thermometer className={`w-6 h-6 mb-1.5 ${f2Alert ? 'text-rose-500 animate-bounce' : 'text-indigo-500'}`} />
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Temp</span>
              <span className={`text-2xl font-black mt-0.5 ${f2Alert ? 'text-rose-500' : 'text-indigo-500'}`}>
                {fridge2.temp.toFixed(1)}°C
              </span>
            </div>
            {/* Humidity Panel */}
            <div className="nm-inset p-3 flex flex-col items-center">
              <Droplets className="w-6 h-6 mb-1.5 text-blue-500" />
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Humidity</span>
              <span className="text-2xl font-black mt-0.5 text-blue-500">
                {fridge2.hum.toFixed(1)}%
              </span>
            </div>
            {/* Door Panel */}
            <div className={`nm-inset p-3 flex flex-col items-center transition-colors duration-300 ${isD2Open ? 'bg-rose-500/5' : ''}`}>
              {isD2Open ? (
                <DoorOpen className="w-6 h-6 mb-1.5 text-rose-500 animate-pulse" />
              ) : (
                <DoorClosed className="w-6 h-6 mb-1.5 text-emerald-500" />
              )}
              <span className="text-[10px] nm-text-dim uppercase tracking-wider font-bold">Door</span>
              <span className={`text-2xl font-black mt-0.5 ${isD2Open ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isD2Open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>
        </div>

        {/* ================= SYSTEM STATUS CARD ================= */}
        <div className="nm-card relative overflow-hidden transition-all duration-300">
          {/* Top side accent indicator - dynamically colors based on system alerts */}
          <div className={`absolute top-0 left-0 h-2.5 w-full ${sysAccentClass}`}></div>

          <div className="pt-2 mb-6">
            <h2 className="text-xl font-bold nm-text-heading">System Status</h2>
            <span className="text-[10px] nm-text-dim font-bold uppercase tracking-wider font-mono">Hardware & Network Indicators</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Hardware Warning LED Indicator */}
            <div className="nm-inset p-3.5 flex justify-between items-center px-5">
              <span className="text-xs font-bold nm-text-heading">Hardware Alert LED</span>
              <span className={`nm-badge flex items-center gap-1.5 font-bold ${led ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                {led ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                    ALERT TRIGGERED
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    NORMAL (STANDBY)
                  </>
                )}
              </span>
            </div>

            {/* IoT Device Connection Status */}
            <div className="nm-inset p-3.5 flex justify-between items-center px-5">
              <span className="text-xs font-bold nm-text-heading">IoT Hardware Link</span>
              <span className="nm-badge flex items-center gap-1.5 font-bold text-emerald-500 bg-emerald-500/10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                ONLINE (ACTIVE)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Historical Trends Chart */}
      <HistoryChart history={history} maxTemp={maxTemp} />
    </div>
  );
}
