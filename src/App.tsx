import { useEffect, useState, useRef } from 'react';
import { ref, onValue, onChildAdded, query, limitToLast, update, remove, push, get } from 'firebase/database';
import { db } from './firebase';
import { ShieldCheck, LayoutDashboard, History, FileClock, Volume2, VolumeX } from 'lucide-react';

import { useAppDispatch, useAppSelector } from './store';
import { setConnected, setLiveData } from './store/fridgeSlice';
import { toggleTheme } from './store/themeSlice';
import { logout, setAuthReady, setUser, getRoleFromEmail } from './store/authSlice';
import { updateThresholds } from './store/settingsSlice';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { Sun, Moon, LogOut, User } from 'lucide-react';

import Login from './components/Login';
import SettingsPanel from './components/SettingsPanel';
import UserManagement from './components/UserManagement';
import DashboardView, { LiveData } from './components/DashboardView';
import EventsView, { EventRecord } from './components/EventsView';
import ProfileView from './components/ProfileView';
import IncidentLogView, { Incident } from './components/IncidentLogView';
import ActivityLogView, { ActivityLog } from './components/ActivityLogView';
import ReportsView from './components/ReportsView';
import ConnectionLoader from './components/ConnectionLoader';

export default function App() {
  const dispatch = useAppDispatch();

  // --- Redux state ---
  const currentUser = useAppSelector((state) => state.auth.user);
  const themeMode = useAppSelector((state) => state.theme.mode);
  const connected = useAppSelector((state) => state.fridge.connected);
  const isAuthReady = useAppSelector((state) => state.auth.isAuthReady);

  // --- Local state ---
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'users' | 'config' | 'profile' | 'audit' | 'activity' | 'reports'>('dashboard');
  const [eventBadge, setEventBadge] = useState(0);
  const [loadingBypass, setLoadingBypass] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const lastAlertTimeRef = useRef<number>(Date.now());
  const currentUserRoleRef = useRef(currentUser?.role);

  useEffect(() => {
    currentUserRoleRef.current = currentUser?.role;
  }, [currentUser?.role]);
  type ToneType = 'ring' | 'beep' | 'chime' | 'buzzer' | 'siren' | 'sonar' | 'morse' | 'pulse' | 'laser' | 'melody';

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sound_enabled') !== 'false';
  });

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('alert_volume');
    return saved !== null ? parseInt(saved, 10) : 50;
  });

  const [selectedTone, setSelectedTone] = useState<ToneType>(() => {
    return (localStorage.getItem('selected_tone') as any) || 'ring';
  });

  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const volumeRef = useRef<number>(volume);
  const selectedToneRef = useRef<ToneType>(selectedTone);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    volumeRef.current = volume;
    localStorage.setItem('alert_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    selectedToneRef.current = selectedTone;
    localStorage.setItem('selected_tone', selectedTone);
  }, [selectedTone]);

  const playAlertSound = (toneOverride?: ToneType, volumeOverride?: number) => {
    try {
      const activeTone = toneOverride || selectedToneRef.current;
      const activeVol = (volumeOverride !== undefined ? volumeOverride : volumeRef.current) / 100;
      
      if (activeVol === 0) return;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (activeTone === 'ring') {
        const playSingleRing = (delay: number) => {
          const time = ctx.currentTime + delay;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(453, time);
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(494, time);
          
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(activeVol * 0.12, time + 0.05);
          gain.gain.setValueAtTime(activeVol * 0.12, time + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(time);
          osc2.start(time);
          osc1.stop(time + 0.6);
          osc2.stop(time + 0.6);
        };
        
        playSingleRing(0);
        playSingleRing(0.7);
        playSingleRing(2.0);
        playSingleRing(2.7);
      } else if (activeTone === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        gain.gain.setValueAtTime(activeVol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (activeTone === 'chime') {
        const playChimeNote = (freq: number, delay: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(activeVol * 0.15, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        playChimeNote(523.25, 0, 0.25);
        playChimeNote(659.25, 0.15, 0.45);
      } else if (activeTone === 'buzzer') {
        const playBuzz = (delay: number) => {
          const time = ctx.currentTime + delay;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(activeVol * 0.15, time + 0.02);
          gain.gain.setValueAtTime(activeVol * 0.15, time + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.3);
        };
        playBuzz(0);
        playBuzz(0.4);
      } else if (activeTone === 'siren') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.8);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.2);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1.6);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(activeVol * 0.12, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(activeVol * 0.12, ctx.currentTime + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.6);
      } else if (activeTone === 'sonar') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(activeVol * 0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      } else if (activeTone === 'morse') {
        const playBeep = (timeStart: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime + timeStart);
          gain.gain.setValueAtTime(0, ctx.currentTime + timeStart);
          gain.gain.linearRampToValueAtTime(activeVol * 0.15, ctx.currentTime + timeStart + 0.01);
          gain.gain.setValueAtTime(activeVol * 0.15, ctx.currentTime + timeStart + duration - 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeStart + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + timeStart);
          osc.stop(ctx.currentTime + timeStart + duration);
        };
        playBeep(0.0, 0.08);
        playBeep(0.16, 0.08);
        playBeep(0.32, 0.08);
        playBeep(0.48, 0.24);
        playBeep(0.80, 0.24);
        playBeep(1.12, 0.24);
        playBeep(1.44, 0.08);
        playBeep(1.60, 0.08);
        playBeep(1.76, 0.08);
      } else if (activeTone === 'pulse') {
        const playPulse = (delay: number) => {
          const time = ctx.currentTime + delay;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(750, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(activeVol * 0.2, time + 0.02);
          gain.gain.setValueAtTime(activeVol * 0.2, time + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.12);
        };
        playPulse(0);
        playPulse(0.18);
        playPulse(0.36);
        playPulse(0.54);
      } else if (activeTone === 'laser') {
        const playLaser = (delay: number) => {
          const time = ctx.currentTime + delay;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1800, time);
          osc.frequency.exponentialRampToValueAtTime(300, time + 0.15);
          gain.gain.setValueAtTime(activeVol * 0.15, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.15);
        };
        playLaser(0);
        playLaser(0.25);
        playLaser(0.5);
      } else if (activeTone === 'melody') {
        const playMelodyNote = (freq: number, delay: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(activeVol * 0.15, ctx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        playMelodyNote(261.63, 0.0, 0.25);
        playMelodyNote(329.63, 0.12, 0.25);
        playMelodyNote(392.00, 0.24, 0.25);
        playMelodyNote(523.25, 0.36, 0.5);
      }
    } catch (e) {
      console.warn('Audio ring playback blocked or failed:', e);
    }
  };

  const maxTemp = useAppSelector((state) => state.settings?.maxTempThreshold ?? 8);
  const maxHum = useAppSelector((state) => state.settings?.maxHumThreshold ?? 80);

  // Reset bypass when logging out
  useEffect(() => {
    if (!currentUser) {
      setLoadingBypass(false);
    }
  }, [currentUser]);

  // Check hardware telemetry staleness periodically
  useEffect(() => {
    const checkStale = () => {
      if (latestHeartbeatRef.current) {
        setIsStale(Date.now() - latestHeartbeatRef.current > 10000);
      } else {
        setIsStale(true);
      }
    };
    checkStale();
    const interval = setInterval(checkStale, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Sync auth state with Redux + write login/logout audit events
  const currentUserEmailRef = useRef<string | undefined>(undefined);

  // --- Auth listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const uid = user.email.replace(/\./g, ',');
        const userRef = ref(db, `/users/${uid}`);
        
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const role = userData.role || 'viewer';
            
            dispatch(setUser({
              email: user.email,
              role: role,
            }));
            
            if (currentUserEmailRef.current !== user.email) {
              push(ref(db, '/audit'), {
                timestamp: Date.now(), actor: user.email, actorRole: role,
                action: 'User Login', details: 'Successful authentication', category: 'auth'
              }).catch(() => {});
              currentUserEmailRef.current = user.email;
            }
          } else {
            console.warn('User not found in RTDB users collection. Falling back to default role.');
            const role = getRoleFromEmail(user.email);
            dispatch(setUser({ email: user.email, role }));
          }
        } catch (error) {
          console.warn('Failed to fetch user role (Permission Denied/Network). Falling back to default role.');
          const role = getRoleFromEmail(user.email);
          dispatch(setUser({ email: user.email, role }));
        }
      } else {
        if (currentUserEmailRef.current) {
          push(ref(db, '/audit'), {
            timestamp: Date.now(), actor: currentUserEmailRef.current, actorRole: currentUserRoleRef.current || 'unknown',
            action: 'User Logout', details: 'Session ended', category: 'auth'
          }).catch(() => {});
        }
        currentUserEmailRef.current = undefined;
        dispatch(logout());
      }
      dispatch(setAuthReady(true));
    });
    return () => unsubscribe();
  }, [dispatch]);

  // --- Heartbeat Connection Tracking ---
  const offlineEventFiredRef = useRef<boolean>(false);
  const offlineSinceRef = useRef<number | null>(null);
  const latestHeartbeatRef = useRef<number | null>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!latestHeartbeatRef.current) return;
      const timeDiff = Date.now() - latestHeartbeatRef.current;
      // ESP32 pushes every 5s. If 30s pass without update, assume offline/power failure.
      if (timeDiff > 30000) {
        if (!offlineEventFiredRef.current) {
          offlineEventFiredRef.current = true;
          offlineSinceRef.current = Date.now();
          // Trigger CONNECTION_LOST event only once per offline cycle
          push(ref(db, '/events'), {
            type: 'CONNECTION_LOST',
            deviceId: 'esp32_main',
            fridge: 'system',
            message: 'Device offline detected (No heartbeat for 30 seconds).',
            timestamp: offlineSinceRef.current,
            acknowledged: false
          }).catch(console.error);

          push(ref(db, '/audit'), {
            timestamp: offlineSinceRef.current,
            actor: 'System',
            actorRole: 'admin',
            action: 'Connection Lost',
            details: 'Device offline detected (No heartbeat for 30 seconds).',
            category: 'alert'
          }).catch(console.error);
        }
      } else {
        if (offlineEventFiredRef.current) {
          offlineEventFiredRef.current = false;
          const duration = offlineSinceRef.current ? Date.now() - offlineSinceRef.current : null;
          offlineSinceRef.current = null;
          
          // Trigger CONNECTION_RESTORED event
          push(ref(db, '/events'), {
            type: 'CONNECTION_RESTORED',
            deviceId: 'esp32_main',
            fridge: 'system',
            message: 'Device connection restored.',
            duration: duration, // Record downtime duration in ms
            timestamp: Date.now(),
            acknowledged: false
          }).catch(console.error);

          push(ref(db, '/audit'), {
            timestamp: Date.now(),
            actor: 'System',
            actorRole: 'admin',
            action: 'Connection Restored',
            details: `Device connection restored. Offline duration: ${duration ? Math.round(duration / 1000) : 0}s`,
            category: 'alert'
          }).catch(console.error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Subscribe to /live and /events from RTDB.
  const currentUserEmail = currentUser?.email;
  useEffect(() => {
    if (!currentUserEmail) return;

    // --- DB Connection listener ---
    const connectedRef = ref(db, '.info/connected');
    const unsubConnected = onValue(connectedRef, (snap) => {
      console.log('Firebase DB .info/connected:', snap.val());
      dispatch(setConnected(snap.val() === true));
    });

    // --- /live listener ---
    const liveRef = ref(db, '/live');
    onValue(liveRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as LiveData;
        latestHeartbeatRef.current = val.updatedAt;
        dispatch(setLiveData(val));
      }
    }, (err) => {
      console.error('RTDB /live error:', err);
    });

    // --- /events listener ---
    const eventsRef = query(ref(db, '/events'), limitToLast(100));
    const unsubEvents = onChildAdded(eventsRef, (snap) => {
      if (snap.exists()) {
        const e = { id: snap.key, ...snap.val() } as EventRecord;
        console.log('Incoming EventRecord:', e); // DEBUG LOG
        setEvents(prev => {
          const list = [e, ...prev].sort((a, b) => b.timestamp - a.timestamp);
          return list.slice(0, 100);
        });
        setEventBadge((prev) => prev + 1);

        if (e.timestamp > lastAlertTimeRef.current) {
          if (soundEnabledRef.current && (e.type.endsWith('_ALERT') || e.type.endsWith('_REMINDER'))) {
            playAlertSound();
          }

          // Trigger native OS Notification (Web Push equivalent for foreground)
          if (e.type.endsWith('_ALERT') || e.type.endsWith('_REMINDER') || e.type.includes('RESTORED')) {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                const titleMap: Record<string, string> = {
                  'HIGH_TEMP_ALERT': '🚨 High Temp Alert',
                  'DOOR_OPEN_ALERT': '🚪 Door Open Alert',
                  'CONNECTION_RESTORED': '✅ Connection Restored',
                  'POWER_RESTORED': '⚡ Power Restored',
                  'HIGH_HUM_ALERT': '💧 High Humidity'
                };
                const title = titleMap[e.type] || `Alert: ${e.type}`;
                const opts = {
                  body: `[${e.fridge || 'System'}] ${e.message}`,
                  icon: '/favicon.svg',
                  requireInteraction: true
                };
                
                // Mobile devices (especially iOS PWAs) require using the Service Worker to show notifications
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.showNotification) {
                      reg.showNotification(title, opts);
                    } else {
                      new Notification(title, opts);
                    }
                  }).catch(() => {
                    new Notification(title, opts);
                  });
                } else {
                  new Notification(title, opts);
                }
              } catch (err) {
                console.error('Failed to trigger native notification:', err);
              }
            }
          }

          const RECOV_SUFFIX  = '_RECOVERY';
          if (e.type.endsWith('_ALERT') || e.type.endsWith('_REMINDER')) {
            const typePrefix = e.type.replace('_ALERT', '').replace('_REMINDER', '');
            push(ref(db, '/incidents'), {
              type: e.type, typePrefix, fridge: e.fridge ?? 'system',
              status: 'active', triggeredAt: e.timestamp, triggeredMessage: e.message,
              timeline: [{ time: e.timestamp, action: 'Alert triggered', actor: 'System', detail: e.message }],
            }).catch(() => {});
            
            push(ref(db, '/audit'), {
              timestamp: e.timestamp, actor: 'System', actorRole: 'admin',
              action: 'Alert triggered', details: `[${e.fridge}] ${e.type}: "${e.message}"`, category: 'alert',
            }).catch(() => {});
          } else if (e.type.endsWith(RECOV_SUFFIX)) {
            const typePrefix = e.type.replace(RECOV_SUFFIX, '');
            setIncidents(prev => {
              const match = [...prev]
                .sort((a, b) => b.triggeredAt - a.triggeredAt)
                .find(i => i.fridge === (e.fridge ?? 'system') && i.type.startsWith(typePrefix) && i.status !== 'resolved');
              if (match) {
                const updatedTimeline = [...(match.timeline ?? []), { time: e.timestamp, action: 'Auto-resolved', actor: 'System', detail: e.message }];
                update(ref(db, `/incidents/${match.id}`), { status: 'resolved', resolvedAt: e.timestamp, resolvedMessage: e.message, timeline: updatedTimeline }).catch(() => {});
                push(ref(db, '/audit'), { timestamp: e.timestamp, actor: 'System', actorRole: 'admin', action: 'Alert resolved', details: `[${e.fridge}] ${e.type}: "${e.message}"`, category: 'alert' }).catch(() => {});
              }
              return prev;
            });
          }
          lastAlertTimeRef.current = e.timestamp;
        }
      }
    });

    // --- /settings listener ---
    const settingsRef = ref(db, '/settings');
    const unsubSettings = onValue(settingsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        dispatch(updateThresholds({
          temp: val.TEMP_LIMIT !== undefined ? val.TEMP_LIMIT : val.maxTempThreshold,
          hum: val.humid !== undefined ? val.humid : val.maxHumThreshold
        }));
      }
    }, (err) => console.error('RTDB /settings error:', err));

    // --- /incidents listener ---
    const incidentsQ = query(ref(db, '/incidents'), limitToLast(300));
    const unsubIncidents = onChildAdded(incidentsQ, (snap) => {
      if (snap.exists()) {
        const i = { id: snap.key, ...snap.val() } as Incident;
        setIncidents(prev => {
          const list = [i, ...prev.filter(x => x.id !== i.id)].sort((a, b) => b.triggeredAt - a.triggeredAt);
          return list.slice(0, 300);
        });
      }
    });

    // We also need to listen for incident updates (e.g. resolution)
    import('firebase/database').then(({ onChildChanged }) => {
      onChildChanged(incidentsQ, (snap) => {
        if (snap.exists()) {
          const updatedInc = { id: snap.key, ...snap.val() } as Incident;
          setIncidents(prev => prev.map(i => i.id === updatedInc.id ? updatedInc : i));
        }
      });
    });

    // --- /audit listener ---
    const auditQ = query(ref(db, '/audit'), limitToLast(200));
    const unsubAudit = onChildAdded(auditQ, (snap) => {
      if (snap.exists()) {
        const log = { id: snap.key, ...snap.val() } as ActivityLog;
        setActivityLogs(prev => {
          const list = [log, ...prev.filter(x => x.id !== log.id)].sort((a, b) => b.timestamp - a.timestamp);
          return list.slice(0, 200);
        });
      }
    });

    return () => {
      unsubConnected();
      unsubEvents();
      unsubSettings();
      unsubIncidents();
      unsubAudit();
    };
  }, [currentUserEmail, dispatch]);

  const handleAcknowledge = (id: string, note?: string) => {
    const eventRef = ref(db, `/devices/esp32_main/events/${id}`);
    const target = events.find(e => e.id === id);
    update(eventRef, {
      acknowledged: true,
      acknowledgedBy: currentUser?.email || 'Unknown',
      ...(note ? { note } : {})
    }).then(() => {
      // Audit log
      push(ref(db, '/audit'), {
        timestamp: Date.now(),
        actor: currentUser?.email || 'Unknown',
        actorRole: currentUser?.role || 'viewer',
        action: 'Acknowledged alert',
        details: target
          ? `[${target.fridge}] ${target.type}: "${target.message}"${note ? ` — Note: "${note}"` : ''}`
          : `Event ID: ${id}${note ? ` — Note: "${note}"` : ''}`,
        category: 'alert',
      }).catch(() => {});

      // Update linked incident: find the most recent non-resolved incident for same fridge+type
      if (target) {
        const typePrefix = target.type.replace('_ALERT', '').replace('_RECOVERY', '').replace('_REMINDER', '');
        const match = [...incidents]
          .sort((a, b) => b.triggeredAt - a.triggeredAt)
          .find(i =>
            i.fridge === (target.fridge ?? 'system') &&
            i.type.startsWith(typePrefix) &&
            i.status === 'active'
          );
        if (match) {
          const updatedTimeline = [
            ...(match.timeline ?? []),
            {
              time: Date.now(),
              action: 'Acknowledged',
              actor: currentUser?.email || 'Unknown',
              detail: note ? `Note: "${note}"` : 'No note provided',
            }
          ];
          update(ref(db, `/incidents/${match.id}`), {
            status: 'acknowledged',
            acknowledgedAt: Date.now(),
            acknowledgedBy: currentUser?.email || 'Unknown',
            acknowledgedNote: note ?? '',
            timeline: updatedTimeline,
          }).catch(() => {});
        }
      }
    }).catch((err) => console.error('Firebase acknowledge error:', err));
  };

  const handleDeleteEvent = (id: string) => {
    const eventRef = ref(db, `/devices/esp32_main/events/${id}`);
    const target = events.find(e => e.id === id);
    remove(eventRef).then(() => {
      push(ref(db, '/audit'), {
        timestamp: Date.now(),
        actor: currentUser?.email || 'Unknown',
        actorRole: currentUser?.role || 'admin',
        action: 'Deleted event',
        details: target
          ? `[${target.fridge}] ${target.type}: "${target.message}"`
          : `Event ID: ${id}`,
        category: 'alert',
      }).catch(() => {});
    }).catch((err) => console.error('Firebase delete event error:', err));
  };

  const handleClearAllEvents = () => {
    const eventsRef = ref(db, '/devices/esp32_main/events');
    const count = events.length;
    remove(eventsRef).then(() => {
      push(ref(db, '/audit'), {
        timestamp: Date.now(),
        actor: currentUser?.email || 'Unknown',
        actorRole: currentUser?.role || 'admin',
        action: 'Cleared all events',
        details: `Purged entire event log (${count} record${count !== 1 ? 's' : ''})`,
        category: 'alert',
      }).catch(() => {});
    }).catch((err) => console.error('Firebase clear events error:', err));
  };

  // Clear badge when visiting events tab
  useEffect(() => {
    if (activeTab === 'events') setEventBadge(0);
  }, [activeTab]);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'text-rose-500';
      case 'operator': return 'text-indigo-500';
      default: return 'text-emerald-500';
    }
  };

  // --- Show login if not authenticated ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ background: 'var(--nm-bg)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
          <p className="nm-text-dim text-xs font-bold tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  // --- Show Connection Loader until connected or bypassed ---
  if (!loadingBypass) {
    return <ConnectionLoader onContinue={() => setLoadingBypass(true)} />;
  }

  return (
    <div className="min-h-screen nm-text-primary font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(var(--nm-bg-rgb), 0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-black nm-text-heading tracking-tight flex items-center gap-2">
              <span>❄️</span> Smart Refrigerator Monitor
            </h1>
            <p className="nm-text-dim text-xs mt-0.5">IoT Project · Firebase Realtime Database</p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* User Badge + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="nm-badge flex items-center gap-1.5 font-bold text-[11px]">
                  <User className="w-3.5 h-3.5 nm-text-dim" />
                  <span className="nm-text-primary hidden sm:inline max-w-[120px] truncate">{currentUser.email}</span>
                  <span className={`font-black uppercase border-l border-slate-400/20 pl-1.5 ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    signOut(auth);
                    dispatch(logout());
                  }}
                  className="nm-btn p-2 rounded-xl text-rose-500"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="nm-btn flex items-center justify-center p-2.5 rounded-full"
              title="Toggle Theme"
            >
              {themeMode === 'dark'
                ? <Sun className="w-5 h-5 text-amber-400" />
                : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            {/* Sound Alerts Toggle */}
            <button
              onClick={() => {
                const nextVal = !soundEnabled;
                setSoundEnabled(nextVal);
                if (nextVal) {
                  // Play alert sound as test confirmation
                  playAlertSound();
                }
              }}
              className="nm-btn flex items-center justify-center p-2.5 rounded-full"
              title={soundEnabled ? 'Disable Sound Alerts' : 'Enable Sound Alerts'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-500 animate-pulse" />
              ) : (
                <VolumeX className="w-5 h-5 text-rose-500" />
              )}
            </button>

            {/* Overall Refrigerator Monitoring Status */}
            <div className="nm-badge flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${
                connected && !isStale 
                  ? 'bg-emerald-400 animate-pulse' 
                  : connected 
                    ? 'bg-amber-400 animate-pulse' 
                    : 'bg-rose-500'
              }`} />
              <span className={
                connected && !isStale 
                  ? 'text-emerald-500' 
                  : connected 
                    ? 'text-amber-500' 
                    : 'text-rose-500'
              }>
                {connected && !isStale 
                  ? 'SYSTEM ACTIVE' 
                  : connected 
                    ? 'WAITING FOR SIGNALS...' 
                    : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-0 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 shrink-0 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'nm-inset text-cyan-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            id="tab-events"
            onClick={() => { setActiveTab('events'); setEventBadge(0); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 relative shrink-0 whitespace-nowrap ${
              activeTab === 'events'
                ? 'nm-inset text-indigo-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Events
            {eventBadge > 0 && activeTab !== 'events' && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {eventBadge > 9 ? '9+' : eventBadge}
              </span>
            )}
          </button>

          {/* Config tab (Admins & Operators) */}
          {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
            <button
              id="tab-config"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 shrink-0 whitespace-nowrap ${
                activeTab === 'config'
                  ? 'nm-inset text-indigo-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Configurations
            </button>
          )}

          {/* Incident Log tab (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              id="tab-audit"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 shrink-0 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'nm-inset text-amber-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <FileClock className="w-3.5 h-3.5" />
              Incident Log
            </button>
          )}

          {/* Reports tab (Admin & Operator) */}
          {(currentUser.role === 'admin' || currentUser.role === 'operator') && (
            <button
              id="tab-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 shrink-0 whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'nm-inset text-emerald-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Reports
            </button>
          )}

          {/* Activity Logs tab (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              id="tab-activity"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                activeTab === 'activity'
                  ? 'nm-inset text-blue-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Activity Logs
            </button>
          )}

          {/* User Management tab (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              id="tab-users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                activeTab === 'users'
                  ? 'nm-inset text-rose-500'
                  : 'nm-text-dim hover:nm-text-primary'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              User Management
            </button>
          )}

          {/* Profile tab */}
          <button
            id="tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
              activeTab === 'profile'
                ? 'nm-inset text-cyan-500'
                : 'nm-text-dim hover:nm-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </button>
        </div>
      </header>

      {/* ========== PAGE CONTENT ========== */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
        {activeTab === 'dashboard' && <DashboardView maxTemp={maxTemp} maxHum={maxHum} dbConnected={connected} />}
        {activeTab === 'events' && (
          <EventsView
            events={events}
            canView={true}
            currentUserRole={currentUser.role}
            onAcknowledge={handleAcknowledge}
            onDeleteEvent={handleDeleteEvent}
            onClearAll={handleClearAllEvents}
          />
        )}
        {activeTab === 'config' && (currentUser.role === 'admin' || currentUser.role === 'operator') && (
          <SettingsPanel

            volume={volume}
            setVolume={setVolume}
            selectedTone={selectedTone}
            setSelectedTone={setSelectedTone}
            onPlayTest={playAlertSound}
            currentUserEmail={currentUser.email}
            currentUserRole={currentUser.role}
          />
        )}
        {activeTab === 'users' && currentUser.role === 'admin' && <UserManagement />}
        {activeTab === 'audit' && currentUser.role === 'admin' && <IncidentLogView incidents={incidents} />}
        {activeTab === 'activity' && currentUser.role === 'admin' && (
          <ActivityLogView 
            logs={activityLogs} 
            onClearAll={() => remove(ref(db, '/audit')).catch(err => console.error(err))} 
          />
        )}
        {activeTab === 'reports' && (currentUser.role === 'admin' || currentUser.role === 'operator') && (
          <ReportsView events={events} incidents={incidents} activityLogs={activityLogs} />
        )}
        {activeTab === 'profile' && <ProfileView />}
      </main>
    </div>
  );
}
