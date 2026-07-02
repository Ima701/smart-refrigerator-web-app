import { Sliders, Thermometer, Droplets } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { updateThresholds } from '../store/settingsSlice';
import { ref, set, push } from 'firebase/database';
import { db } from '../firebase';
import { LiveData } from './DashboardView';

interface SettingsPanelProps {
  volume: number;
  setVolume: (v: number) => void;
  selectedTone: string;
  setSelectedTone: (t: any) => void;
  onPlayTest: (toneOverride?: any, volumeOverride?: number) => void;
  currentUserEmail?: string;
  currentUserRole?: string;
}

export default function SettingsPanel({
  volume,
  setVolume,
  selectedTone,
  setSelectedTone,
  onPlayTest,
  currentUserEmail = 'System',
  currentUserRole = 'admin',
}: SettingsPanelProps) {
  const dispatch = useAppDispatch();
  const maxTemp = useAppSelector((state) => state.settings.maxTempThreshold);
  const maxHum = useAppSelector((state) => state.settings.maxHumThreshold);
  const liveData = useAppSelector((state) => state.fridge.liveData) as LiveData | null;


  const handleTempSave = (newTempLimit: number) => {
    // Push config audit entry
    push(ref(db, '/audit'), {
      timestamp: Date.now(),
      actor: currentUserEmail,
      actorRole: currentUserRole,
      action: 'Updated threshold',
      details: `Max Temp changed from ${maxTemp.toFixed(1)}°C to ${newTempLimit.toFixed(1)}°C`,
      category: 'config',
    }).catch(() => {});

    set(ref(db, '/settings/TEMP_LIMIT'), newTempLimit).catch((err) => console.error('Firebase save temp limit error:', err));

    if (liveData) {
      const f1Temp = liveData.fridge1.temp;
      const f2Temp = liveData.fridge2.temp;
      const f1Hum = liveData.fridge1.hum;
      const f2Hum = liveData.fridge2.hum;

      // Fridge 1 alert transition
      const f1OldAlert = f1Temp > maxTemp;
      const f1NewAlert = f1Temp > newTempLimit;
      if (f1OldAlert !== f1NewAlert) {
        const type = f1NewAlert ? 'TEMP_ALERT' : 'TEMP_RECOVERY';
        const message = f1NewAlert ? `High temperature detected: ${f1Temp.toFixed(1)}°C` : `Temperature normal: ${f1Temp.toFixed(1)}°C`;
        push(ref(db, '/events'), { type, fridge: 'Fridge1', message, timestamp: Date.now() });
        push(ref(db, '/audit'), {
          timestamp: Date.now(),
          actor: 'System',
          actorRole: 'admin',
          action: f1NewAlert ? 'Alert triggered' : 'Alert resolved',
          details: `Fridge 1: ${message}`,
          category: 'alert',
        }).catch(() => {});
      }

      // Fridge 2 alert transition
      const f2OldAlert = f2Temp > maxTemp;
      const f2NewAlert = f2Temp > newTempLimit;
      if (f2OldAlert !== f2NewAlert) {
        const type = f2NewAlert ? 'TEMP_ALERT' : 'TEMP_RECOVERY';
        const message = f2NewAlert ? `High temperature detected: ${f2Temp.toFixed(1)}°C` : `Temperature normal: ${f2Temp.toFixed(1)}°C`;
        push(ref(db, '/events'), { type, fridge: 'Fridge2', message, timestamp: Date.now() });
        push(ref(db, '/audit'), {
          timestamp: Date.now(),
          actor: 'System',
          actorRole: 'admin',
          action: f2NewAlert ? 'Alert triggered' : 'Alert resolved',
          details: `Fridge 2: ${message}`,
          category: 'alert',
        }).catch(() => {});
      }

      // LED check
      const f1HumAlert = f1Hum > maxHum;
      const f2HumAlert = f2Hum > maxHum;
      
      const newLedState = f1NewAlert || f2NewAlert || f1HumAlert || f2HumAlert;
      if (newLedState !== liveData.led) {
        set(ref(db, '/live/led'), newLedState).catch((err) => console.error(err));
        push(ref(db, '/events'), {
          type: 'LED_CHANGE',
          fridge: 'system',
          message: newLedState ? 'ON' : 'OFF',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleHumidSave = (newHumidLimit: number) => {
    // Push config audit entry
    push(ref(db, '/audit'), {
      timestamp: Date.now(),
      actor: currentUserEmail,
      actorRole: currentUserRole,
      action: 'Updated threshold',
      details: `Max Humidity changed from ${maxHum.toFixed(0)}% to ${newHumidLimit.toFixed(0)}%`,
      category: 'config',
    }).catch(() => {});

    set(ref(db, '/settings/humid'), newHumidLimit).catch((err) => console.error('Firebase save humid error:', err));

    if (liveData) {
      const f1Temp = liveData.fridge1.temp;
      const f2Temp = liveData.fridge2.temp;
      const f1Hum = liveData.fridge1.hum;
      const f2Hum = liveData.fridge2.hum;

      // Fridge 1 humidity alert transition
      const f1OldAlert = f1Hum > maxHum;
      const f1NewAlert = f1Hum > newHumidLimit;
      if (f1OldAlert !== f1NewAlert) {
        const type = f1NewAlert ? 'HUMID_ALERT' : 'HUMID_RECOVERY';
        const message = f1NewAlert ? `High humidity detected: ${f1Hum.toFixed(1)}%` : `Humidity normal: ${f1Hum.toFixed(1)}%`;
        push(ref(db, '/events'), { type, fridge: 'Fridge1', message, timestamp: Date.now() });
        push(ref(db, '/audit'), {
          timestamp: Date.now(),
          actor: 'System',
          actorRole: 'admin',
          action: f1NewAlert ? 'Alert triggered' : 'Alert resolved',
          details: `Fridge 1: ${message}`,
          category: 'alert',
        }).catch(() => {});
      }

      // Fridge 2 humidity alert transition
      const f2OldAlert = f2Hum > maxHum;
      const f2NewAlert = f2Hum > newHumidLimit;
      if (f2OldAlert !== f2NewAlert) {
        const type = f2NewAlert ? 'HUMID_ALERT' : 'HUMID_RECOVERY';
        const message = f2NewAlert ? `High humidity detected: ${f2Hum.toFixed(1)}%` : `Humidity normal: ${f2Hum.toFixed(1)}%`;
        push(ref(db, '/events'), { type, fridge: 'Fridge2', message, timestamp: Date.now() });
        push(ref(db, '/audit'), {
          timestamp: Date.now(),
          actor: 'System',
          actorRole: 'admin',
          action: f2NewAlert ? 'Alert triggered' : 'Alert resolved',
          details: `Fridge 2: ${message}`,
          category: 'alert',
        }).catch(() => {});
      }

      // LED check
      const f1TempAlert = f1Temp > maxTemp;
      const f2TempAlert = f2Temp > maxTemp;
      const newLedState = f1TempAlert || f2TempAlert || f1NewAlert || f2NewAlert;
      if (newLedState !== liveData.led) {
        set(ref(db, '/live/led'), newLedState).catch((err) => console.error(err));
        push(ref(db, '/events'), { type: 'LED_CHANGE', fridge: 'system', message: newLedState ? 'ON' : 'OFF', timestamp: Date.now() });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 nm-card transition-all duration-300">
      <h2 className="text-xl font-bold nm-text-heading mb-4 flex items-center gap-2 pb-3 border-b border-dashed border-slate-700/20">
        <Sliders className="w-5 h-5 text-cyan-500" /> System Configurations
      </h2>
      <p className="text-xs nm-text-dim -mt-2 mb-6">
        Adjust thresholds and notification settings below. Exceeding values will immediately trigger alerts on the live security stream.
      </p>

      {/* Threshold settings row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Temperature threshold setting */}
        <div className="nm-inset p-5 flex flex-col justify-between">
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
            onMouseUp={(e) => handleTempSave(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleTempSave(parseFloat((e.target as HTMLInputElement).value))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[9px] nm-text-dim font-bold mt-2.5">
            <span>0.0°C (Coldest)</span>
            <span>25.0°C (Room Temp)</span>
          </div>
        </div>

        {/* Humidity threshold setting */}
        <div className="nm-inset p-5 flex flex-col justify-between">
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
            onMouseUp={(e) => handleHumidSave(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleHumidSave(parseFloat((e.target as HTMLInputElement).value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[9px] nm-text-dim font-bold mt-2.5">
            <span>20% (Dry)</span>
            <span>95% (Damp)</span>
          </div>
        </div>
      </div>

      {/* Sound & Tone settings row */}
      <div className="border-t border-dashed border-slate-700/20 pt-6">
        <h3 className="text-sm font-black uppercase tracking-wider nm-text-heading flex items-center gap-2 mb-3">
          🔊 Sound & Alerts Customization
        </h3>
        <p className="text-xs nm-text-dim mb-6">
          Adjust the volume and choose the notification alert ringtone style for this browser.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Volume Control */}
          <div className="nm-inset p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider nm-text-heading">
                Alert Tone Volume
              </span>
              <span className="text-sm font-black text-indigo-500">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] nm-text-dim font-bold mt-2.5">
              <span>Mute (0%)</span>
              <span>Maximum (100%)</span>
            </div>
          </div>

          {/* Tone Selector */}
          <div className="nm-inset p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider nm-text-heading">
                Notification Tone
              </span>
            </div>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="w-full px-3 py-2 text-xs nm-flat outline-none rounded-xl nm-text-heading border-slate-700/10 bg-[var(--nm-bg)] cursor-pointer"
            >
              <option value="ring">🔔 Telephone Ring Alert</option>
              <option value="beep">📟 Digital Beep</option>
              <option value="chime">🎵 Premium Chime</option>
              <option value="buzzer">🚨 Retro Buzzer Warning</option>
              <option value="siren">📣 Industrial Siren Sweep</option>
              <option value="sonar">📡 Sonar Ping</option>
              <option value="morse">📻 Morse Code SOS</option>
              <option value="pulse">⚡ Pulse Alarm</option>
              <option value="laser">🔫 Sci-Fi Laser Sweep</option>
              <option value="melody">🎼 Major Arpeggio Chime</option>
            </select>
            <span className="text-[9px] nm-text-dim font-bold mt-2.5">
              Choose your alarm style.
            </span>
          </div>

          {/* Test Play Trigger */}
          <div className="nm-inset p-5 flex flex-col justify-center items-center">
            <span className="text-xs font-bold uppercase tracking-wider nm-text-heading mb-4">
              Test Audio Broadcast
            </span>
            <button
              onClick={() => onPlayTest(selectedTone, volume)}
              className="nm-btn px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center gap-2"
            >
              🔊 Play Test Tone
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
