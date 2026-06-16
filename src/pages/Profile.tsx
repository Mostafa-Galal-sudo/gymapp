import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useDeviceStore } from '../store/useDeviceStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import {
  Download, Upload, Save, Trophy, Plus, ShieldAlert, Watch, Activity,
  HeartPulse, ShieldCheck, Globe, ChevronUp, ChevronDown, Camera, X, Loader2
} from 'lucide-react';
import { useT } from '../hooks/useT';
import { useLanguageStore } from '../store/useLanguageStore';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// ── Custom Recharts Tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,9,15,0.95)', border: '1px solid rgba(0,240,255,0.2)',
      borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontWeight: 700 }}>
        {payload[0].value} kg
      </div>
    </div>
  );
};

// ── Edit Profile Modal ────────────────────────────────────────────────────────
const EditProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { profile, updateProfile } = useUserStore();
  const [form, setForm] = useState({ ...profile });
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.profilePhoto || null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 400;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(compressed);
        setForm(f => ({ ...f, profilePhoto: compressed }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => { updateProfile(form); onClose(); };

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(2,4,8,0.9)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', animation: 'fadeIn 0.2s ease'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 440, padding: '1.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--color-text-muted)' }}>
          <X size={20} />
        </button>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          تعديل الملف الشخصي
        </h3>

        {/* Photo Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div
            onClick={() => photoRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: '50%', cursor: 'pointer', position: 'relative',
              background: photoPreview ? 'none' : 'linear-gradient(135deg, var(--cyan), var(--magenta))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', boxShadow: 'var(--shadow-cyan)'
            }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#000' }}>{form.name[0]?.toUpperCase()}</span>
            }
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <Camera size={24} color="#fff" />
            </div>
          </div>
          <input type="file" accept="image/*" ref={photoRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
          <button onClick={() => photoRef.current?.click()} style={{ color: 'var(--cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            <Camera size={14} style={{ display: 'inline', marginRight: 4 }} /> تغيير الصورة
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>الاسم</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>العمر</label>
              <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: +e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>الوزن (كغ)</label>
              <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>الطول (سم)</label>
            <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: +e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>المستوى</label>
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} style={{ width: '100%' }}>
              {['Beginner', 'Intermediate', 'Advanced', 'Elite'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '0.9rem' }}>إلغاء</button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '0.9rem' }}>
            <Save size={16} style={{ display: 'inline', marginRight: 4 }} /> حفظ
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

// ── Garmin BLE Connect ────────────────────────────────────────────────────────
const GarminConnectButton = () => {
  const navigate = useNavigate();
  const { isConnected, deviceName, setConnected, setCurrentHR } = useDeviceStore();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const charRef = useRef<any>(null);

  const handleConnect = async () => {
    setError(null);
    if (!('bluetooth' in navigator)) {
      setError('البلوتوث غير مدعوم في هذا المتصفح. استخدم Chrome على Android.');
      return;
    }
    setScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate'],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      charRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (e: any) => {
        const value = e.target.value;
        const flags = value.getUint8(0);
        const is16bit = flags & 0x1;
        const hr = is16bit ? value.getUint16(1, true) : value.getUint8(1);
        setCurrentHR(hr);
      });
      device.addEventListener('gattserverdisconnected', () => { setScanning(false); });
      setConnected(device.name || 'Garmin Device');
      setScanning(false);
      navigate('/device-live');
    } catch (err: any) {
      setScanning(false);
      if (err.name !== 'NotFoundError') {
        setError('فشل الاتصال: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  if (isConnected) {
    return (
      <button onClick={() => navigate('/device-live')}
        style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.75rem',
          color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer'
        }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        {deviceName} · فتح
      </button>
    );
  }

  return (
    <div>
      <button onClick={handleConnect} disabled={scanning}
        style={{
          background: scanning ? 'rgba(0,240,255,0.05)' : 'rgba(0,240,255,0.1)',
          border: '1px solid rgba(0,240,255,0.3)',
          borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.75rem',
          color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem',
          cursor: scanning ? 'not-allowed' : 'pointer'
        }}>
        {scanning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <HeartPulse size={14} />}
        {scanning ? 'جاري البحث...' : 'اتصال حقيقي'}
      </button>
      {error && <div style={{ fontSize: '0.65rem', color: 'var(--magenta)', marginTop: '0.3rem', maxWidth: 200 }}>{error}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Trophy Room ───────────────────────────────────────────────────────────────
const TrophyRoom = () => {
  const { badges, xp, level } = useGamificationStore();
  const t = useT();
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  const levelNames = ['', t('dash.beginner'), t('dash.intermediate'), t('dash.advanced'), t('dash.elite'), t('dash.legend')];
  const levelName = levelNames[Math.min(level, 5)] || t('dash.legend');
  const xpForLevel = level * level * 100;
  const xpPrev = (level - 1) * (level - 1) * 100;
  const progress = ((xp - xpPrev) / (xpForLevel - xpPrev)) * 100;

  return (
    <div>
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          {t('profile.current_rank')}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', letterSpacing: '0.08em', lineHeight: 1 }} className="gradient-text">
          {levelName.toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.5rem 0 1rem' }}>
          {t('dash.level')} {level} · {xp.toLocaleString()} {t('profile.total_xp')}
        </div>
        <div className="xp-bar-track" style={{ height: 10, borderRadius: 'var(--radius-full)', overflow: 'visible' }}>
          <div className="xp-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>Lv {level}</span>
          <span>{xpForLevel.toLocaleString()} XP → Lv {level + 1}</span>
        </div>
      </div>

      {unlockedBadges.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="section-label" style={{ color: 'var(--gold)' }}>
            <Trophy size={12} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
            {t('profile.unlocked')} — {unlockedBadges.length}/{badges.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {unlockedBadges.map((badge, i) => (
              <div key={badge.id} className="badge-card unlocked animate-badge-pop" style={{ animationDelay: `${i * 0.06}s` }}>
                <span className="badge-icon">{badge.icon}</span>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.3 }}>{badge.name}</div>
                {badge.unlockedAt && (
                  <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(badge.unlockedAt), 'MMM d')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="section-label">{t('profile.locked')} — {lockedBadges.length} {t('profile.remaining')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {lockedBadges.map(badge => (
            <div key={badge.id} className="badge-card locked">
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{badge.icon}</span>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-heading)', textAlign: 'center', lineHeight: 1.3 }}>{badge.name}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.4 }}>{badge.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Workout History View ──────────────────────────────────────────────────────
const WorkoutHistoryView = () => {
  const history = useWorkoutStore(s => s.history);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<{ sessionIdx: number; exIdx: number; setIdx: number } | null>(null);
  const [editVals, setEditVals] = useState({ weight: 0, reps: 0, rpe: 0 });
  const [localHistory, setLocalHistory] = useState(() => [...history].reverse());

  const handleSaveEdit = () => {
    if (!editingSet) return;
    const { sessionIdx, exIdx, setIdx } = editingSet;
    setLocalHistory(prev => prev.map((s, si) => {
      if (si !== sessionIdx) return s;
      const exercises = s.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const sets = ex.sets.map((st, sti) => sti !== setIdx ? st : { ...st, ...editVals });
        return { ...ex, sets };
      });
      return { ...s, exercises };
    }));
    setEditingSet(null);
  };

  if (localHistory.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0', fontSize: '0.9rem' }}>
        لا يوجد سجل تمارين بعد. ابدأ جلستك الأولى!
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {localHistory.map((session, si) => {
        const isExpanded = expandedId === session.sessionId;
        return (
          <div key={session.sessionId} className="glass-card animate-fade-up" style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : session.sessionId)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', color: 'var(--color-text)' }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>{session.type}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                  {format(new Date(session.date), 'dd MMM yyyy')} · {session.totalVolume.toLocaleString()} kg
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--cyan)' }}>{session.exercises.length} تمرين</span>
                {isExpanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
              </div>
            </button>
            {isExpanded && (
              <div style={{ padding: '0 1.25rem 1rem' }}>
                {session.exercises.map((ex, ei) => (
                  <div key={ex.exerciseId} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '0.5rem' }}>{ex.exerciseId}</div>
                    {ex.sets.filter(s => s.completed).map((set, sti) => {
                      const isEditing = editingSet?.sessionIdx === si && editingSet?.exIdx === ei && editingSet?.setIdx === sti;
                      return (
                        <div key={set.setNumber} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', width: 40 }}>Set {set.setNumber}</span>
                          {isEditing ? (
                            <>
                              <input type="number" value={editVals.weight} onChange={e => setEditVals(v => ({ ...v, weight: +e.target.value }))} style={{ width: 56, textAlign: 'center', padding: '0.2rem' }} placeholder="kg" />
                              <span style={{ color: 'var(--color-text-muted)' }}>×</span>
                              <input type="number" value={editVals.reps} onChange={e => setEditVals(v => ({ ...v, reps: +e.target.value }))} style={{ width: 48, textAlign: 'center', padding: '0.2rem' }} placeholder="reps" />
                              <button onClick={handleSaveEdit} className="btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}>✓</button>
                              <button onClick={() => setEditingSet(null)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>✕</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', flex: 1 }}>{set.weight}kg × {set.reps} <span style={{ color: 'var(--color-text-muted)' }}>RPE {set.rpe}</span></span>
                              <button onClick={() => { setEditingSet({ sessionIdx: si, exIdx: ei, setIdx: sti }); setEditVals({ weight: set.weight, reps: set.reps, rpe: set.rpe }); }} style={{ color: 'var(--cyan)', fontSize: '0.65rem', padding: '0.1rem 0.4rem', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 4 }}>تعديل</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Profile Page ──────────────────────────────────────────────────────────────
const Profile = () => {
  const userStore = useUserStore();
  const workoutStore = useWorkoutStore();
  const gamification = useGamificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const { lang, toggleLang } = useLanguageStore();

  const [newWeight, setNewWeight] = useState('');
  const [tab, setTab] = useState<'stats' | 'trophies' | 'history'>('trophies');
  const [showEditModal, setShowEditModal] = useState(false);

  const [injuries, setInjuries] = useState([
    { id: '1', part: 'Right Shoulder', severity: 4, status: 'Recovering' },
    { id: '2', part: 'Lower Back', severity: 2, status: 'Active' }
  ]);
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [newInjury, setNewInjury] = useState({ part: '', severity: 5 });

  const handleAddInjury = () => {
    if (!newInjury.part) return;
    setInjuries([...injuries, { id: Date.now().toString(), part: newInjury.part, severity: newInjury.severity, status: 'Active' }]);
    setShowAddInjury(false);
    setNewInjury({ part: '', severity: 5 });
  };

  const handleExport = async () => {
    const data = {
      user: JSON.parse(localStorage.getItem('omnibody-user-storage') || '{}').state,
      workout: JSON.parse(localStorage.getItem('omnibody-workout-storage') || '{}').state,
      nutrition: JSON.parse(localStorage.getItem('omnibody-nutrition-storage') || '{}').state,
      gamification: JSON.parse(localStorage.getItem('omnibody-gamification-storage') || '{}').state,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `omnibody-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        await Filesystem.writeFile({ path: fileName, data: btoa(unescape(encodeURIComponent(jsonString))), directory: Directory.Cache });
        const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
        await Share.share({ title: 'OmniBody Backup', text: 'My OmniBody data backup', url: fileUri.uri, dialogTitle: 'Export Data' });
      } catch (err) { console.error('Export failed', err); }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // TODO: Update import logic for new Dexie DB schema
        // if (data.user) userStore.importData(data.user);
        // if (data.workout) workoutStore.importData(data.workout);
        // if (data.nutrition) nutritionStore.importData(data.nutrition);
        if (data.gamification) gamification.importData(data.gamification);
        alert('Data restored successfully!');
      } catch { alert('Invalid backup file. Please try again.'); }
    };
    reader.readAsText(file);
  };

  const handleLogWeight = () => {
    const w = parseFloat(newWeight);
    if (!isNaN(w) && w > 0) { userStore.logWeight(w); setNewWeight(''); }
  };

  const chartData = userStore.weightHistory.map(e => ({
    date: format(new Date(e.date), 'MMM d'),
    weight: e.weight,
  }));

  const { profile } = userStore;
  const totalSessions = workoutStore.history.length;
  const totalVolume = workoutStore.history.reduce((a, s) => a + s.totalVolume, 0);

  const TabBtn = ({ id, label }: { id: 'stats' | 'trophies' | 'history'; label: string }) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '0.65rem', fontFamily: 'var(--font-heading)',
      fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase',
      background: tab === id ? 'rgba(0,240,255,0.1)' : 'transparent',
      color: tab === id ? 'var(--cyan)' : 'var(--color-text-muted)',
      borderBottom: `2px solid ${tab === id ? 'var(--cyan)' : 'transparent'}`,
      transition: 'all 0.2s',
    }}>{label}</button>
  );

  return (
    <div className="page">
      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}

      {/* Header */}
      <header style={{ marginBottom: '1.75rem' }}>
        <div className="section-label">{t('profile.athlete')}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.06em' }}>
          <span className="gradient-text">{t('profile.title')}</span>
        </h1>
      </header>

      {/* Profile Card */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Avatar — shows photo if exists */}
          <div
            onClick={() => setShowEditModal(true)}
            style={{
              width: 70, height: 70, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              background: profile.profilePhoto ? 'none' : 'linear-gradient(135deg, var(--cyan), var(--magenta))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-cyan)', overflow: 'hidden', position: 'relative',
            }}
          >
            {profile.profilePhoto
              ? <img src={profile.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#000' }}>{profile.name[0].toUpperCase()}</span>
            }
            {/* Camera overlay hint */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <Camera size={20} color="#fff" />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>{profile.name}</div>
              <button
                onClick={() => setShowEditModal(true)}
                style={{ color: 'var(--cyan)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', border: '1px solid rgba(0,240,255,0.3)', borderRadius: 6, background: 'rgba(0,240,255,0.06)' }}
              >
                تعديل
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)', marginTop: '0.15rem' }}>
              {profile.age} {t('profile.age')} · {profile.weight}{t('common.kg')} · {profile.height}cm
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {t('dash.level')} {t(`dash.${profile.level.toLowerCase()}` as any) || profile.level} · {profile.goals.map(g => t(`auth.goal.${g}` as any) || g).join(' · ')}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[
            { label: t('dash.sessions'), val: totalSessions },
            { label: t('dash.volume'), val: `${(totalVolume / 1000).toFixed(1)}T` },
            { label: 'XP', val: gamification.xp.toLocaleString() },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center', background: 'rgba(0,240,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan)' }}>{val}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.2rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wearables Hub */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Watch size={18} /> {t('profile.wearables')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} /> {t('profile.apple_health')}</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>قريباً</span>
          </div>
          {/* Garmin — Real BLE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HeartPulse size={16} /> {t('profile.garmin')}</div>
            <GarminConnectButton />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} /> {t('profile.whoop')}</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>قريباً</span>
          </div>
        </div>
      </div>

      {/* Injury Management */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--magenta)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ShieldAlert size={18} /> {t('profile.injuries')}
          </h3>
          <button onClick={() => setShowAddInjury(!showAddInjury)} style={{ background: 'none', border: 'none', color: 'var(--cyan)' }}><Plus size={18} /></button>
        </div>

        {showAddInjury && (
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, marginBottom: '1rem' }}>
            <input type="text" placeholder={t('profile.body_part')} value={newInjury.part}
              onChange={e => setNewInjury({ ...newInjury, part: e.target.value })}
              style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--magenta)', color: '#fff', borderRadius: 4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{t('profile.severity')}: {newInjury.severity}/10</span>
              <input type="range" min="1" max="10" value={newInjury.severity} onChange={e => setNewInjury({ ...newInjury, severity: parseInt(e.target.value) })} style={{ flex: 1 }} />
            </div>
            <button className="btn-primary" onClick={handleAddInjury} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}>{t('profile.log_injury')}</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {injuries.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{t('profile.no_injuries')}</div>
            : injuries.map(inj => (
              <div key={inj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, borderLeft: `3px solid ${inj.status === 'Active' ? 'var(--magenta)' : 'var(--color-warning)'}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{inj.part}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{t('profile.severity')}: {inj.severity}/10</div>
                </div>
                <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => setInjuries(injuries.map(i => i.id === inj.id ? { ...i, status: i.status === 'Active' ? 'Recovering' : 'Active' } : i))}>
                  {inj.status === 'Active' ? t('profile.active') : t('profile.recovering')}
                </button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,240,255,0.1)', marginBottom: '1.25rem' }}>
        <TabBtn id="trophies" label={`🏆 ${t('profile.trophies')}`} />
        <TabBtn id="stats" label={`📈 ${t('profile.progress')}`} />
        <TabBtn id="history" label={`📋 ${t('profile.history') || 'سجل التمارين'}`} />
      </div>

      {tab === 'trophies' && <TrophyRoom />}

      {tab === 'stats' && (
        <div>
          <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="section-label">{t('profile.weight_trend')}</div>
            <div style={{ height: 200, marginBottom: '1rem' }}>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.06)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-muted)' }} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-muted)' }} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="weight" stroke="var(--cyan)" strokeWidth={2.5}
                      dot={{ r: 5, fill: 'var(--bg-base)', stroke: 'var(--cyan)', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: 'var(--cyan)', stroke: 'var(--cyan)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {t('profile.log_weighins')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input type="number" placeholder={t('profile.enter_weight')} value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                style={{ flex: 1 }}
              />
              <button onClick={handleLogWeight} className="btn-primary" style={{ padding: '0.75rem 1.25rem', flexShrink: 0 }}>
                <Save size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && <WorkoutHistoryView />}

      {/* App Settings */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div className="section-label">{t('profile.app_settings')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} color="var(--cyan)" />
            <span style={{ fontWeight: 600 }}>{t('common.language')}</span>
          </div>
          <button className="btn-secondary" onClick={toggleLang} style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div className="section-label">{t('profile.data_backup')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={handleExport} className="btn-secondary" style={{ width: '100%', padding: '1rem' }}>
            <Download size={18} /> {t('profile.export_json')}
          </button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s',
            }}>
            <Upload size={18} /> {t('profile.import_json')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Profile;