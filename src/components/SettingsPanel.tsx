import { Sliders, Thermometer, Droplets } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { updateThresholds } from '../store/settingsSlice';

export default function SettingsPanel() {
  const dispatch = useAppDispatch();
  const maxTemp = useAppSelector((state) => state.settings.maxTempThreshold);
  const maxHum = useAppSelector((state) => state.settings.maxHumThreshold);

  return (
    <div className="max-w-7xl mx-auto mt-8 nm-card transition-all duration-300">
      <h2 className="text-xl font-bold nm-text-heading mb-4 flex items-center gap-2 pb-3 border-b border-dashed border-slate-700/20">
        <Sliders className="w-5 h-5 text-cyan-500" /> System Configurations (Thresholds)
      </h2>
      <p className="text-xs nm-text-dim -mt-2 mb-6">
        Adjust the safety thresholds below. Exceeding values will immediately trigger alerts on the live security stream and telemetry cards.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Temperature threshold setting */}
        <div className="nm-inset p-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider nm-text-heading flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-500" /> Max Temp Limit
            </span>
            <span className="text-sm font-black text-rose-500">{maxTemp.toFixed(1)}°C</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={maxTemp}
            onChange={(e) => dispatch(updateThresholds({ temp: parseFloat(e.target.value) }))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[9px] nm-text-dim font-bold mt-2.5">
            <span>0.0°C (Coldest)</span>
            <span>25.0°C (Room Temp)</span>
          </div>
        </div>

        {/* Humidity threshold setting */}
        <div className="nm-inset p-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider nm-text-heading flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-500" /> Max Humidity Limit
            </span>
            <span className="text-sm font-black text-blue-500">{maxHum.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            step="1"
            value={maxHum}
            onChange={(e) => dispatch(updateThresholds({ hum: parseFloat(e.target.value) }))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[9px] nm-text-dim font-bold mt-2.5">
            <span>20% (Dry)</span>
            <span>95% (Damp)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
