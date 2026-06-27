import { Thermometer, Droplets, Shield, ShieldAlert, DoorClosed } from 'lucide-react';

interface FridgeCardProps {
  title: string;
  accentColor: 'cyan' | 'violet';
  temp: number | string;
  hum: number | string;
  door: string;
}

export default function FridgeCard({ title, accentColor, temp, hum, door }: FridgeCardProps) {
  const isTempCritical = parseFloat(String(temp)) > 8.0;
  const isDoorOpen = door === 'OPEN';
  const isCritical = isTempCritical || isDoorOpen;

  // Weather-app inspired accents: Glacier Blue (#06b6d4) and Aurora Indigo (#6366f1)
  const accentBorderClass = accentColor === 'cyan' ? 'bg-cyan-500' : 'bg-indigo-500';
  
  // Custom weather colors: hot temp warning is Rose/Storm Red, safe is Glacier or Aurora
  const tempTextClass = isTempCritical 
    ? 'text-rose-500 dark:text-rose-400' 
    : (accentColor === 'cyan' ? 'text-cyan-500 dark:text-cyan-400' : 'text-indigo-500 dark:text-indigo-400');
  
  const tempIconClass = isTempCritical 
    ? 'text-rose-500 animate-bounce' 
    : (accentColor === 'cyan' ? 'text-cyan-500 dark:text-cyan-400' : 'text-indigo-500 dark:text-indigo-400');
  
  // Humidity is styled like Raindrop Blue (#3b82f6)
  const humTextClass = 'text-blue-500 dark:text-blue-400';
  const humIconClass = 'text-blue-500 dark:text-blue-400';

  return (
    <div className="nm-card relative overflow-hidden transition-all duration-300">
      {/* Dynamic Weather Side Accent Strip */}
      <div className={`absolute top-0 left-0 h-2.5 w-full ${accentBorderClass}`}></div>
      
      <div className="flex justify-between items-center mb-6 pl-3">
        <h2 className="text-xl font-bold nm-text-heading">{title}</h2>
        <div className={`nm-badge flex items-center gap-1.5 font-bold ${isDoorOpen ? 'text-rose-500' : 'nm-text-dim'}`}>
          <DoorClosed className="w-3.5 h-3.5" />
          Door: {door}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-5 pl-2">
        {/* Temperature Readings (Glacier / Aurora / Storm) */}
        <div className="nm-inset p-4 flex flex-col items-center">
          <Thermometer className={`w-6 h-6 mb-2 ${tempIconClass}`} />
          <span className="text-[10px] nm-text-dim uppercase tracking-widest font-bold">Temperature</span>
          <span className={`text-3xl font-black mt-1 ${tempTextClass}`}>
            {parseFloat(String(temp)).toFixed(1)}°C
          </span>
        </div>
        
        {/* Humidity Readings (Raindrop Blue) */}
        <div className="nm-inset p-4 flex flex-col items-center">
          <Droplets className={`w-6 h-6 mb-2 ${humIconClass}`} />
          <span className="text-[10px] nm-text-dim uppercase tracking-widest font-bold">Humidity</span>
          <span className={`text-3xl font-black mt-1 ${humTextClass}`}>
            {parseFloat(String(hum)).toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Weather Safety Indicator */}
      <div className="mt-6 nm-inset p-4 flex items-center justify-between mx-2">
        <span className="text-xs nm-text-dim font-medium">Security Status:</span>
        {isCritical ? (
          <span className="text-xs font-black text-rose-500 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 animate-pulse" /> STORM WARNING
          </span>
        ) : (
          <span className="text-xs font-black text-emerald-500 flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> CLEAR & SECURE
          </span>
        )}
      </div>
    </div>
  );
}
