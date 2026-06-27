import { AlertTriangle } from 'lucide-react';
import { AlertRecord } from '../store/alertsSlice';

interface SecurityLogsProps {
  alerts: AlertRecord[];
}

export default function SecurityLogs({ alerts }: SecurityLogsProps) {
  return (
    <div className="nm-card flex flex-col h-full transition-all duration-300">
      <h2 className="text-lg font-bold nm-text-heading mb-4 flex items-center gap-2 pb-3 pl-1 border-b border-dashed border-slate-700/20">
        <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" /> Live Security Stream
      </h2>
      
      <div className="nm-inset flex-1 p-4 overflow-y-auto font-mono text-[10.5px] max-h-[190px] min-h-[190px] nm-scroll shadow-inner">
        {alerts.length === 0 ? (
          <p className="nm-text-dim italic text-center pt-14">System active. Waiting for cloud data...</p>
        ) : (
          alerts.map((al, idx) => {
            const isAlert = al.message.includes('⚠️') || al.message.includes('🚪') || al.message.includes('❌');
            const textColor = isAlert ? 'text-rose-500 dark:text-rose-400 font-semibold' : 'nm-text-primary';

            return (
              <div key={idx} className="mb-2.5 pb-2 border-b border-dashed border-slate-700/10 last:border-0 leading-relaxed">
                <span className="text-blue-500 dark:text-blue-400 font-bold mr-1.5">[{al.time}]</span>
                <span className={textColor}>{al.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
