import { useState, useEffect, useRef } from 'react';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useExerciseStore } from '../store/useExerciseStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { PlateCalculator } from '../components/PlateCalculator';
import {
  Play, Check, ChevronDown, ChevronUp, X, 
  Mic, MicOff, Edit3, ArrowLeftRight, Star, History, Plus, ChevronRight
} from 'lucide-react';
import { useT } from '../hooks/useT';

// ── Circular Countdown Timer ──────────────────────────────────────────────────
const CircularTimer = ({ defaultSeconds }: { defaultSeconds: number }) => {
  const [total, setTotal]   = useState(defaultSeconds);
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [active, setActive] = useState(false);
  const [isAlarming, setIsAlarming] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ((window as any)._vibId) {
        clearInterval((window as any)._vibId);
        navigator.vibrate?.(0);
      }
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (seconds <= 0) {
      setActive(false);
      setIsAlarming(true);
      if (navigator.vibrate) {
        const vibId = setInterval(() => navigator.vibrate?.([300, 100, 300]), 1000);
        (window as any)._vibId = vibId;
      }
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audioRef.current.loop = true;
        }
        audioRef.current.play();
      } catch (e) {}
      return;
    }
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  const stopAlarm = () => {
    setIsAlarming(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ((window as any)._vibId) {
      clearInterval((window as any)._vibId);
      navigator.vibrate?.(0);
    }
  };

  const toggleTimer = () => {
    if (isAlarming) {
      stopAlarm();
      setSeconds(total);
    } else {
      setActive(!active);
    }
  };

  const start = (t: number) => { 
    stopAlarm();
    setTotal(t); setSeconds(t); setActive(true); 
  };

  const pct = total === 0 ? 0 : seconds / total;
  const size = 100;
  const sw = 8;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const color = isAlarming ? 'var(--magenta)' : (seconds <= 10 ? 'var(--magenta)' : 'var(--cyan)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div 
          onClick={toggleTimer}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>
            {Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,'0')}
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isAlarming ? 'STOP' : (active ? 'PAUSE' : 'PLAY')}
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
        {[
          { label: '45s', val: 45 }, { label: '60s', val: 60 },
          { label: '90s', val: 90 }, { label: '2m', val: 120 },
          { label: '3m', val: 180 }
        ].map(({ label, val }) => (
          <button key={val} onClick={() => start(val)} style={{
            fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.5rem',
            border: `1px solid ${seconds===val&&active ? 'var(--cyan)' : 'rgba(0,240,255,0.2)'}`,
            borderRadius: 'var(--radius-sm)',
            color: seconds===val&&active ? 'var(--cyan)' : 'var(--color-text-muted)',
            background: 'transparent',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
};

// ── Modals (Video, Swap, Notes) ────────────────────────────────────────────────
const ModalWrapper = ({ children, onClose }: any) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(2,4,8,0.92)', backdropFilter: 'blur(16px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '1.5rem', animation: 'fadeIn 0.2s ease', overflowY: 'auto'
  }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: '1.5rem', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '1rem', insetInlineEnd: '1rem', color: 'var(--color-text-muted)' }}><X size={20} /></button>
      {children}
    </div>
  </div>
);

// ── Notes Modal with Dictation ──
const NotesModal = ({ exerciseId, name, initNotes, onClose }: any) => {
  const t = useT();
  const [text, setText] = useState(initNotes || '');
  const [listening, setListening] = useState(false);
  const updateNotes = useWorkoutStore(s => s.updateNotes);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        }
        if (finalTranscript) setText((prev: string) => prev + (prev ? ' ' : '') + finalTranscript);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) return alert('Speech recognition not supported in this browser.');
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleSave = () => {
    updateNotes(exerciseId, text);
    onClose();
  };

  return (
    <ModalWrapper onClose={onClose}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('workout.notes')}: {name}</h3>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        rows={6} placeholder="How did this exercise feel? Any pain?"
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={toggleListen} className="btn-secondary" style={{ flex: 1, borderColor: listening ? 'var(--magenta)' : 'var(--cyan)', color: listening ? 'var(--magenta)' : 'var(--cyan)' }}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />} {listening ? t('workout.stop') : t('workout.dictate')}
        </button>
        <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>{t('common.save')}</button>
      </div>
    </ModalWrapper>
  );
};

// ── Swap Modal ──
const SwapModal = ({ currentExId, currentCategory, currentMuscle, onClose }: any) => {
  const t = useT();
  const swapExercise = useWorkoutStore(s => s.swapExercise);
  const getAllExercises = useExerciseStore(s => s.getAllExercises);
  const [search, setSearch] = useState('');

  const exercises = getAllExercises();
  
  // AI-like suggestion logic
  const filtered = exercises.filter(e => {
    if (e.id === currentExId) return false;
    if (search) return e.name.toLowerCase().includes(search.toLowerCase());
    return e.muscleGroup === currentMuscle || e.category === currentCategory;
  });

  const handleSwap = (newId: string) => {
    swapExercise(currentExId, newId);
    onClose();
  };

  return (
    <ModalWrapper onClose={onClose}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('workout.swap')}</h3>
      <input type="text" placeholder={t('workout.search_alt')} value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {filtered.map(ex => {
          const exName = useLanguageStore.getState().lang === 'ar' && ex.nameAr ? ex.nameAr : ex.name;
          return (
          <button key={ex.id} onClick={() => handleSwap(ex.id)}
            style={{
              width: '100%', textAlign: 'start', padding: '0.75rem',
              borderBottom: '1px solid rgba(0,240,255,0.1)', color: 'var(--color-text)',
            }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{ex.category} · {ex.muscleGroup}</div>
          </button>
        );
        })}
      </div>
    </ModalWrapper>
  );
};

// ── Custom Exercise Manager Modal ──
const CustomExerciseManager = ({ onClose }: any) => {
  const t = useT();
  const addCustomExercise = useExerciseStore(s => s.addCustomExercise);
  const duplicateExercise = useExerciseStore(s => s.duplicateExercise);
  const deleteCustomExercise = useExerciseStore(s => s.deleteCustomExercise);
  const customExercises = useExerciseStore(s => s.customExercises);

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Push');
  const [muscle, setMuscle] = useState('');

  const handleSave = () => {
    if (!name || !muscle) return alert('Name and muscle group required');
    addCustomExercise({
      id: `custom_${Date.now()}`,
      name, category, muscleGroup: muscle,
      isCustom: true, equipment: [], description: '', createdAt: Date.now()
    });
    setMode('list');
    setName(''); setMuscle('');
  };

  return (
    <ModalWrapper onClose={onClose}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
        {mode === 'list' ? t('workout.custom_manager') : t('workout.create_new')}
      </h3>
      
      {mode === 'create' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <input type="text" placeholder={t('workout.ex_name')} value={name} onChange={e => setName(e.target.value)} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {['Push', 'Pull', 'Legs', 'Neck', 'Hand/Grip', 'Face', 'Eye', 'Breathing'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Muscle Group (e.g. Biceps)" value={muscle} onChange={e => setMuscle(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setMode('list')} className="btn-secondary" style={{ flex: 1 }}>{t('common.cancel')}</button>
            <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>{t('common.save')}</button>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setMode('create')} className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>+ {t('workout.create_new')}</button>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {customExercises.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No custom exercises yet.</div>
            ) : customExercises.map(ex => (
              <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid rgba(0,240,255,0.1)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{ex.category} · {ex.muscleGroup}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => duplicateExercise(ex.id)} style={{ color: 'var(--cyan)', fontSize: '0.75rem', border: '1px solid var(--cyan)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>Copy</button>
                  <button onClick={() => deleteCustomExercise(ex.id)} style={{ color: 'var(--magenta)', fontSize: '0.75rem', border: '1px solid var(--magenta)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>Del</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ModalWrapper>
  );
};

// ── Exercise History Modal ──
const HistoryModal = ({ exerciseId, name, onClose }: any) => {
  const t = useT();
  const history = useWorkoutStore(s => s.history);
  
  // Find all instances of this exercise in history
  const instances = history.map(session => {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) return null;
    return { date: session.date, sets: ex.sets };
  }).filter(Boolean).slice(-10); // Last 10 sessions

  return (
    <ModalWrapper onClose={onClose}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('workout.history')}: {name}</h3>
      {instances.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No history found for this exercise.</div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {instances.map((inst: any, idx: number) => {
            const bestSet = inst.sets.filter((s:any)=>s.completed).reduce((best:any, s:any) => (!best || s.weight > best.weight) ? s : best, null);
            return (
              <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,240,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  {new Date(inst.date).toLocaleDateString()}
                </div>
                {inst.sets.map((set: any) => set.completed && (
                  <div key={set.setNumber} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Set {set.setNumber}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{set.weight}kg x {set.reps} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>(RPE {set.rpe})</span></span>
                  </div>
                ))}
                {bestSet && <div style={{ fontSize: '0.7rem', color: 'var(--gold)', marginTop: '0.5rem' }}>{t('workout.top_set')}: {bestSet.weight}kg x {bestSet.reps}</div>}
              </div>
            );
          })}
        </div>
      )}
    </ModalWrapper>
  );
};

// ── Add Exercise Modal ─────────────────────────────────────────────────────────
const AddExerciseModal = ({ onClose }: any) => {
  const t = useT();
  const addExercise = useWorkoutStore(s => s.addExerciseToSession);
  const getAllExercises = useExerciseStore(s => s.getAllExercises);
  const activeSession = useWorkoutStore(s => s.activeSession);
  const [search, setSearch] = useState('');

  const exercises = getAllExercises();
  const existingIds = activeSession?.exercises.map(e => e.exerciseId) || [];
  
  const filtered = exercises.filter(e => {
    if (existingIds.includes(e.id)) return false;
    if (search) return e.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const handleAdd = (newId: string) => {
    addExercise(newId);
    onClose();
  };

  return (
    <ModalWrapper onClose={onClose}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
        {t('workout.add_exercise') || 'إضافة تمرين'}
      </h3>
      <input type="text" placeholder={t('workout.search_alt')} value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {filtered.map(ex => {
          const exName = useLanguageStore.getState().lang === 'ar' && ex.nameAr ? ex.nameAr : ex.name;
          return (
          <button key={ex.id} onClick={() => handleAdd(ex.id)}
            style={{
              width: '100%', textAlign: 'start', padding: '0.75rem',
              borderBottom: '1px solid rgba(0,240,255,0.1)', color: 'var(--color-text)',
            }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{ex.category} · {ex.muscleGroup}</div>
          </button>
        );
        })}
      </div>
    </ModalWrapper>
  );
};

// ── Warmup & Cooldown Checklists ──────────────────────────────────────────────
const ChecklistPhase = ({ title, items, onComplete }: { title: string, items: string[], onComplete: () => void }) => {
  const t = useT();
  const [checked, setChecked] = useState<number[]>([]);
  return (
    <div className="page" style={{ padding: '1rem 1rem 7rem' }}>
      <div className="section-label">{title}</div>
      <h1 className="gradient-text display" style={{ fontSize: '3rem', marginBottom: '2rem' }}>PREPARE</h1>
      
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        {items.map((item, idx) => {
          const isChecked = checked.includes(idx);
          return (
            <div key={idx} onClick={() => setChecked(c => isChecked ? c.filter(i=>i!==idx) : [...c, idx])}
              style={{
                display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 0',
                borderBottom: idx < items.length-1 ? '1px solid rgba(0,240,255,0.1)' : 'none',
                cursor: 'pointer', opacity: isChecked ? 0.5 : 1, transition: 'var(--transition)'
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isChecked ? 'var(--cyan)' : 'var(--color-text-muted)'}`,
                background: isChecked ? 'var(--cyan)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isChecked && <Check size={14} color="#000" />}
              </div>
              <span style={{ fontSize: '0.9rem', textDecoration: isChecked ? 'line-through' : 'none' }}>{item}</span>
            </div>
          );
        })}
      </div>
      <button onClick={onComplete} className="btn-primary" style={{ width: '100%', padding: '1rem' }}>
        {t('workout.proceed')} <ChevronRight size={18} style={{ marginInlineStart: 4 }} />
      </button>
    </div>
  );
};

// ── Main Player ───────────────────────────────────────────────────────────────
const WorkoutPlayer = () => {
  const t = useT();
  const activeSession = useWorkoutStore(s => s.activeSession);
  const updateSet     = useWorkoutStore(s => s.updateSet);
  const finishSession = useWorkoutStore(s => s.finishSession);
  const setPhase      = useWorkoutStore(s => s.setPhase);
  const addXP         = useGamificationStore(s => s.addXP);
  const getAllExercises = useExerciseStore(s => s.getAllExercises);
  const toggleFavorite= useExerciseStore(s => s.toggleFavorite);
  const favorites     = useExerciseStore(s => s.favoriteExerciseIds);

  const [modalType, setModalType] = useState<'notes' | 'swap' | 'plate' | 'history' | 'create' | 'add' | null>(null);
  const [modalEx, setModalEx] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const removeExercise = useWorkoutStore(s => s.removeExerciseFromSession);

  useEffect(() => {
    let wl: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((w: any) => { wl = w; }).catch(() => {});
    }
    return () => { if (wl) wl.release().catch(() => {}); };
  }, []);

  if (!activeSession) return null;

  const allEx = getAllExercises();

  if (activeSession.phase === 'warmup') {
    const items = [
      'Jumping jacks or light jog (2 min)',
      'Arm circles & torso twists (1 min)',
      'Dynamic mobility (10 reps)',
      'Empty bar / lightweight activation (2 sets x 15 reps)'
    ];
    return <ChecklistPhase title={t('workout.warmup')} items={items} onComplete={() => setPhase('main')} />;
  }

  if (activeSession.phase === 'cooldown') {
    const items = [
      'Static stretching trained muscles (30s each)',
      'Foam rolling or lacrosse ball massage',
      '5 Deep diaphragmatic breaths',
      'Hang from pullup bar (30s)'
    ];
    return <ChecklistPhase title={t('workout.cooldown')} items={items} onComplete={finishSession} />;
  }

  const handleComplete = (exId: string, setNum: number) => {
    const ex = activeSession.exercises.find(e => e.exerciseId === exId);
    const set = ex?.sets.find(s => s.setNumber === setNum);
    if (!set) return;
    const nowCompleted = !set.completed;
    updateSet(exId, setNum, { completed: nowCompleted });
    if (nowCompleted) addXP(10 + (set.weight || 0) * 0.05);
  };

  const getRpeLabel = (rpe: number) => {
    if (rpe === 10) return 'Max';
    if (rpe === 9) return '1 Left';
    if (rpe === 8) return '2 Left';
    if (rpe === 7) return '3 Left';
    if (rpe === 6) return '4 Left';
    return '';
  };

  return (
    <>
      {modalType === 'swap' && <SwapModal currentExId={modalEx.id} currentCategory={modalEx.category} currentMuscle={modalEx.muscleGroup} onClose={() => setModalType(null)} />}
      {modalType === 'notes' && <NotesModal exerciseId={modalEx.id} name={modalEx.name} initNotes={activeSession.exercises.find(e=>e.exerciseId===modalEx.id)?.notes} onClose={() => setModalType(null)} />}
      {modalType === 'plate' && <ModalWrapper onClose={() => setModalType(null)}><PlateCalculator /></ModalWrapper>}
      {modalType === 'history' && <HistoryModal exerciseId={modalEx.id} name={modalEx.name} onClose={() => setModalType(null)} />}
      {modalType === 'create' && <CustomExerciseManager onClose={() => setModalType(null)} />}
      {modalType === 'add' && <AddExerciseModal onClose={() => setModalType(null)} />}

      <div className="page" style={{ padding: '1rem 1rem 7rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div className="section-label">{t('workout.active_session')}</div>
            <h1 className="neon-cyan display" style={{ fontSize: '2.2rem' }}>{activeSession.type}</h1>
          </div>
          <CircularTimer defaultSeconds={120} />
        </div>

        <button onClick={() => setModalType('plate')} className="btn-secondary" style={{ width: '100%', marginBottom: '1.25rem', padding: '0.75rem' }}>
          {t('workout.open_calc')}
        </button>

        {activeSession.exercises.map((ex, idx) => {
          const def = allEx.find(e => e.id === ex.exerciseId) || allEx[0];
          const isCollapsed = collapsed[ex.exerciseId];
          const completedSets = ex.sets.filter(s => s.completed).length;
          const exName = useLanguageStore.getState().lang === 'ar' && def.nameAr ? def.nameAr : def.name;
          return (
            <div key={ex.exerciseId} className="glass-card animate-fade-up" style={{ marginBottom: '1rem', animationDelay: `${idx * 0.05}s` }}>
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isCollapsed ? 'none' : '1px solid rgba(0,240,255,0.08)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>{exName}</span>
                    {def.isRehab && <span className="tag-rehab">REHAB</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {completedSets}/{ex.sets.length} sets completed
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <button onClick={() => toggleFavorite(def.id)} style={{ color: favorites.includes(def.id) ? 'var(--gold)' : 'var(--color-text-muted)', padding: '0.4rem' }}>
                    <Star size={16} fill={favorites.includes(def.id) ? 'var(--gold)' : 'none'} />
                  </button>
                  <button onClick={() => { setModalEx(def); setModalType('history'); }} style={{ color: 'var(--color-text-muted)', padding: '0.4rem' }}><History size={16} /></button>
                  <button onClick={() => { setModalEx(def); setModalType('swap'); }} style={{ color: 'var(--cyan)', padding: '0.4rem' }}><ArrowLeftRight size={16} /></button>
                  <button onClick={() => { setModalEx(def); setModalType('notes'); }} style={{ color: 'var(--color-text-muted)', padding: '0.4rem' }}><Edit3 size={16} /></button>
                  <button onClick={() => removeExercise(ex.exerciseId)} style={{ color: 'var(--magenta)', padding: '0.4rem' }}><X size={16} /></button>
                  <button onClick={() => setCollapsed(c => ({ ...c, [ex.exerciseId]: !c[ex.exerciseId] }))} style={{ color: 'var(--color-text-muted)', padding: '0.4rem' }}>
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div style={{ padding: '0.5rem 1rem 1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    <div>SET</div><div>KG</div><div>REPS</div><div>RPE</div><div></div>
                  </div>
                  {ex.sets.map(set => (
                    <div key={set.setNumber} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 1fr 40px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{set.setNumber}</div>
                      <input type="number" value={set.weight || ''} onChange={e => updateSet(ex.exerciseId, set.setNumber, { weight: parseFloat(e.target.value)||0 })} style={{ textAlign: 'center' }} />
                      <input type="number" value={set.reps || ''} onChange={e => updateSet(ex.exerciseId, set.setNumber, { reps: parseFloat(e.target.value)||0 })} style={{ textAlign: 'center' }} />
                      <div style={{ position: 'relative' }}>
                        <input type="number" min="1" max="10" value={set.rpe || ''} onChange={e => updateSet(ex.exerciseId, set.setNumber, { rpe: parseFloat(e.target.value)||0 })} style={{ textAlign: 'center', width: '100%' }} />
                        {set.rpe >= 6 && <span style={{ position: 'absolute', bottom: -12, insetInlineStart: 0, insetInlineEnd: 0, textAlign: 'center', fontSize: '0.5rem', color: 'var(--magenta)', whiteSpace: 'nowrap' }}>{getRpeLabel(set.rpe)}</span>}
                      </div>
                      <button onClick={() => handleComplete(ex.exerciseId, set.setNumber)} style={{ height: 40, borderRadius: 'var(--radius-md)', background: set.completed ? 'var(--color-success)' : 'rgba(0,240,255,0.08)', border: `1px solid ${set.completed ? 'var(--color-success)' : 'rgba(0,240,255,0.2)'}`, color: set.completed ? '#000' : 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={18} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  {ex.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}><strong>{t('workout.notes')}:</strong> {ex.notes}</div>}
                </div>
              )}
            </div>
          );
        })}

        <button onClick={() => setModalType('add')} className="btn-secondary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderStyle: 'dashed' }}>
          + {t('workout.add_exercise') || 'Add Exercise'}
        </button>

        <button onClick={() => setPhase('cooldown')} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>{t('workout.finish_main')}</button>
      </div>
    </>
  );
};

// ── Session Selector ──────────────────────────────────────────────────────────
const Workout = () => {
  const t = useT();
  const activeSession = useWorkoutStore(s => s.activeSession);
  const startSession  = useWorkoutStore(s => s.startSession);
  const scheduledSessions = useWorkoutStore(s => s.scheduledSessions);
  const removeScheduledSession = useWorkoutStore(s => s.removeScheduledSession);
  const getAllTemplates = useExerciseStore(s => s.getAllTemplates);
  const [modalType, setModalType] = useState<'create' | null>(null);

  if (activeSession) return <WorkoutPlayer />;

  const schedules = getAllTemplates();
  
  const today = new Date();
  const dStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const todaysPlans = scheduledSessions.filter(s => s.date === dStr);

  return (
    <div className="page">
      {modalType === 'create' && <CustomExerciseManager onClose={() => setModalType(null)} />}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-label">{t('workout.programs')}</div>
          <h1 className="display" style={{ fontSize: '2.5rem' }}>{t('workout.title')} <span className="neon-cyan">{t('workout.session')}</span></h1>
        </div>
        <button onClick={() => setModalType('create')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}>
          <Plus size={14} style={{ marginInlineEnd: 4 }} /> Custom Ex
        </button>
      </header>

      {todaysPlans.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gold)' }}>
            {t('calendar.todays_plan') || "Today's Plan"}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {todaysPlans.map(plan => (
              <div key={plan.id} className="glass-card animate-fade-up" style={{ padding: '1.25rem', borderLeft: '3px solid var(--gold)', background: 'rgba(255, 215, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>{plan.type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{plan.exerciseIds.length} {t('workout.exercises')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => removeScheduledSession(plan.id)} style={{ color: 'var(--magenta)', padding: '0.5rem', background: 'rgba(255, 0, 85, 0.1)', borderRadius: '8px' }}>
                      <X size={16} />
                    </button>
                    <button onClick={() => startSession(plan.type, plan.exerciseIds)} className="btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem', background: 'var(--gold)', color: '#000', borderColor: 'var(--gold)' }}>
                      <Play size={16} /> {t('workout.start')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0 0.5rem 0' }}>All Programs</h2>
        {Object.entries(schedules).map(([name, exerciseIds]) => (
          <div key={name} className="glass-card animate-fade-up" style={{ padding: '1.25rem', borderLeft: '3px solid var(--cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{exerciseIds.length} {t('workout.exercises')}</div>
              </div>
              <button onClick={() => startSession(name, exerciseIds)} className="btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}>
                <Play size={16} /> {t('workout.start')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workout;
