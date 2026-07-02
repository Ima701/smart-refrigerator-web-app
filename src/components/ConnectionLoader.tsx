import { useEffect, useState } from 'react';
import { Wifi, ShieldAlert, Cpu, Database, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAppSelector } from '../store';

interface ConnectionLoaderProps {
  onContinue: () => void;
}

export default function ConnectionLoader({ onContinue }: ConnectionLoaderProps) {
  const connected = useAppSelector(s => s.fridge.connected);
  const liveData = useAppSelector(s => s.fridge.liveData);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const steps = [
    { label: 'Authentication Gateway Verified', desc: 'Secure session validated successfully.', icon: Cpu },
    { label: 'Firebase Realtime Database Handshake', desc: 'Establishing socket stream to cloud nodes.', icon: Database },
    { label: 'WiFi Telemetry Signal Verification', desc: 'Awaiting device network broadcast.', icon: Wifi },
    { label: 'Refrigerator Sensor Diagnostics', desc: 'Confirming DHT22 and door switch readouts.', icon: ShieldAlert },
  ];

  // Simulated progressive load
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 90 ? 90 : next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Update step index based on progress
  useEffect(() => {
    if (progress < 25) setStep(0);
    else if (progress < 50) setStep(1);
    else if (progress < 75) setStep(2);
    else setStep(3);
  }, [progress]);

  // Set timeout if hardware signal does not arrive
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!liveData) {
        setTimedOut(true);
      }
    }, 7000); // 7 seconds timeout

    return () => clearTimeout(timeout);
  }, [liveData]);

  // If connected successfully and data is flowing, fast-track progress to 100%
  useEffect(() => {
    // Only auto-continue if we are connected AND we have received the first batch of live data
    if (connected && liveData) {
      // If the animation is still at the beginning, let it play for at least 2 seconds so the user sees it
      if (progress < 60) {
        setTimeout(() => setProgress(100), 2000);
      } else {
        setProgress(100);
      }
    }
  }, [connected, liveData]);

  // When progress hits 100, trigger onContinue after a short success delay
  useEffect(() => {
    if (progress === 100) {
      const delay = setTimeout(() => {
        onContinue();
      }, 1000);
      return () => clearTimeout(delay);
    }
  }, [progress, onContinue]);

  const handleRetry = () => {
    window.location.reload();
  };

  const CurrentIcon = steps[step]?.icon || Cpu;

  // Determine if hardware signal is stale
  const isStale = liveData && (Date.now() - (liveData.updatedAt || Date.now()) > 10000);
  const isOffline = timedOut || (liveData === null && timedOut) || isStale;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300" style={{ background: 'var(--nm-bg)' }}>
      <div className="max-w-md w-full nm-card p-8 flex flex-col items-center text-center relative overflow-hidden transition-all duration-500">
        
        {/* Glow accent */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${
          isOffline ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500'
        }`} />

        {isOffline ? (
          /* Connection Interruption / Stale Hardware View */
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full nm-inset flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500 animate-bounce" />
            </div>
            
            <h2 className="text-xl font-bold nm-text-heading mb-2">Hardware Connection Interruption</h2>
            <p className="text-xs nm-text-dim px-4 mb-6 leading-relaxed">
              No live telemetry signal received from the refrigerator controller. Please verify that the ESP32 device is powered on, has valid credentials, and is connected to WiFi.
            </p>

            {/* Diagnostics checklist */}
            <div className="w-full nm-inset p-4 rounded-xl text-left mb-6 flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/10">
                <span className="font-bold nm-text-secondary">Diagnostics Checklist</span>
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Awaiting Signals...</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Database Hub API:</span>
                <span className="text-emerald-500 font-bold">● Operational</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>ESP32 Device Node:</span>
                <span className="text-rose-500 font-bold">● Offline / Out of Range</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Telemetry Sync Status:</span>
                <span className="text-amber-500 font-bold">● Stalled</span>
              </div>
            </div>

            <div className="flex gap-4 w-full">
              <button 
                onClick={handleRetry}
                className="flex-1 nm-btn py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-slate-500/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-cyan-500" /> Reconnect
              </button>
              
              <button 
                onClick={onContinue}
                className="flex-1 nm-btn py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/5 transition-colors"
              >
                Override & View
              </button>
            </div>
          </div>
        ) : (
          /* Normal Loading Screen */
          <div className="w-full flex flex-col items-center">
            {/* Spinning glowing status icon */}
            <div className="w-16 h-16 rounded-full nm-inset flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
              <CurrentIcon className="w-8 h-8 text-cyan-500 animate-pulse" />
            </div>

            <h2 className="text-lg font-black uppercase tracking-widest nm-text-heading mb-1">Connecting Smart Fridge</h2>
            <p className="text-[10px] tracking-wide nm-text-dim uppercase font-bold mb-6">
              Sensing status: {progress < 100 ? `${progress}% Diagnostic Complete` : 'Ready'}
            </p>

            {/* Premium progressive load bar */}
            <div className="w-full nm-inset h-3.5 rounded-full overflow-hidden p-0.5 mb-6">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 shadow-md transition-all duration-300 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Active Step Visualizer */}
            <div className="w-full text-left p-4 rounded-xl bg-slate-500/5 border border-dashed border-slate-700/10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-xs font-bold nm-text-secondary">{steps[step]?.label}</span>
              </div>
              <p className="text-[10px] nm-text-dim mt-1.5 leading-relaxed">{steps[step]?.desc}</p>
            </div>
            
            {progress === 100 && (
              <p className="text-xs text-emerald-500 font-bold mt-4 flex items-center gap-1.5 justify-center animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Diagnostics success! Proceeding...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
