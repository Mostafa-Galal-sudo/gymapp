import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useNavigate } from 'react-router-dom';
import {
  Zap, TrendingUp, AlertTriangle, Dumbbell, Droplet,
  ChevronRight, Activity, Share2, Accessibility, Minus, Plus, Brain,
  Sparkles, Send, X, Loader2
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import html2canvas from 'html2canvas';
import { useT } from '../hooks/useT';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// ── XP Level Bar ──────────────────────────────────────────────────────────────
const XPBar = ({ xp, level }: { xp: number; level: number }) => {
  const t = useT();
  const xpForCurrentLevel = (level - 1) * (level - 1) * 100;
  const xpForNextLevel    = level * level * 100;
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  const levelNames = ['', t('dash.beginner'), t('dash.intermediate'), t('dash.advanced'), t('dash.elite'), t('dash.legend')];
  const levelName  = levelNames[Math.min(level, 5)] || t('dash.legend');

  return (
    <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} color="var(--cyan)" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {t('dash.level')} {level} — {levelName}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)' }}>{xp.toLocaleString()} XP</span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>Lv {level}</span>
        <span>Lv {level + 1} — {xpForNextLevel.toLocaleString()} XP</span>
      </div>
    </div>
  );
};

// ── Stepper Button ────────────────────────────────────────────────────────────
const Stepper = ({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
    <div style={{ fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <button
        onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(1))))}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1px solid rgba(0,240,255,0.25)',
          background: 'rgba(0,240,255,0.06)', color: 'var(--cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,240,255,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,240,255,0.06)')}
      >
        <Minus size={11} />
      </button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, minWidth: 38, textAlign: 'center', color: 'var(--color-text)' }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, parseFloat((value + step).toFixed(1))))}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1px solid rgba(0,240,255,0.25)',
          background: 'rgba(0,240,255,0.06)', color: 'var(--cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,240,255,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,240,255,0.06)')}
      >
        <Plus size={11} />
      </button>
    </div>
  </div>
);

// ── Volume Calculator ─────────────────────────────────────────────────────────
const VolumeCalculator = () => {
  const [sets,   setSets]   = useState(3);
  const [reps,   setReps]   = useState(10);
  const [weight, setWeight] = useState(60);
  const [bump,   setBump]   = useState(0); // animation trigger key

  const volume = sets * reps * weight;
  const prevVol = useRef(volume);

  useEffect(() => {
    if (prevVol.current !== volume) {
      setBump(k => k + 1);
      prevVol.current = volume;
    }
  }, [volume]);

  const intensity =
    volume < 500  ? { label: 'Light',      color: 'var(--color-success)' } :
    volume < 1500 ? { label: 'Moderate',   color: 'var(--cyan)' }          :
    volume < 3000 ? { label: 'Hard',       color: 'var(--color-warning)' } :
                    { label: 'Max Effort', color: 'var(--magenta)' };

  // SVG arc (270° sweep starting at 135°)
  const arcPct   = Math.min(1, volume / 5000);
  const svgSize  = 104;
  const sw       = 8;
  const r        = (svgSize - sw) / 2;
  const circ     = 2 * Math.PI * r;
  const arcLen   = circ * 0.75; // 270° out of 360°
  const fillLen  = arcLen * arcPct;

  return (
    <div className="glass-card animate-fade-up" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <TrendingUp size={15} color="var(--cyan)" />
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
          Volume Calculator
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Arc meter */}
        <div style={{ position: 'relative', flexShrink: 0, width: svgSize, height: svgSize }}>
          <svg width={svgSize} height={svgSize} style={{ transform: 'rotate(135deg)' }}>
            {/* Track ring */}
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={r}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}
              strokeDasharray={`${arcLen} ${circ - arcLen}`}
              strokeLinecap="round"
            />
            {/* Fill ring */}
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={r}
              fill="none" stroke={intensity.color} strokeWidth={sw}
              strokeDasharray={`${fillLen} ${circ - fillLen}`}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 7px ${intensity.color})`,
                transition: 'stroke-dasharray 0.55s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s',
              }}
            />
          </svg>

          {/* Centre label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            paddingBottom: '4px',
          }}>
            <span
              key={bump}
              style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                fontSize: volume >= 10000 ? '0.85rem' : '1.1rem',
                color: intensity.color, lineHeight: 1,
                animation: 'volumePop 0.4s var(--ease-spring)',
              }}
            >
              {volume.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
              kg·vol
            </span>
          </div>
        </div>

        {/* Steppers column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <Stepper label="Sets"       value={sets}   min={1}  max={20}  step={1}   onChange={setSets}   />
          <Stepper label="Reps"       value={reps}   min={1}  max={50}  step={1}   onChange={setReps}   />
          <Stepper label="Weight (kg)" value={weight} min={0}  max={500} step={2.5} onChange={setWeight} />
        </div>
      </div>

      {/* Formula + intensity badge */}
      <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          {sets} × {reps} × {weight}kg
        </span>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: '0.68rem', fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: intensity.color, border: `1px solid ${intensity.color}`,
          padding: '0.15rem 0.65rem', borderRadius: 'var(--radius-full)',
          boxShadow: `0 0 8px ${intensity.color}55`,
        }}>
          {intensity.label}
        </span>
      </div>
    </div>
  );
};

// ── AI Coach Insight ──────────────────────────────────────────────────────────
const AICoachInsight = ({ history, acwr, totalCal, targetCal, sessionCount }: {
  history: any[]; acwr: number; totalCal: number; targetCal: number; sessionCount: number;
}) => {
  const t = useT();
  const profile = useUserStore(s => s.profile);
  const lines: [string, string][] = [];     // [headline, subtitle]

  if (sessionCount === 0) {
    lines.push(["Hey champ — no sessions yet. Let's change that today! 💪", "Start simple. One session is all it takes to build momentum."]);
  } else if (acwr > 1.3) {
    lines.push([
      `Training load is ${((acwr - 1) * 100).toFixed(0)}% above baseline. Time to recover! 🔥`,
      "Muscles grow during rest, not just during reps. Consider a deload day."
    ]);
  } else if (acwr < 0.8) {
    lines.push([
      "Your frequency has dipped. Time to pick it back up! 🚀",
      "Even 20 minutes keeps the momentum going. Progress > perfection."
    ]);
  } else if (totalCal < targetCal * 0.65) {
    lines.push([
      "Nutrition check: you're well under your calorie target today. 🍗",
      "Fuel = performance. Hit your protein goal — muscles are waiting."
    ]);
  } else {
    const lastVol = history.length > 0 ? history[history.length - 1].totalVolume : 0;
    const prevVol = history.length > 1 ? history[history.length - 2].totalVolume : 0;
    if (prevVol > 0 && lastVol > prevVol * 1.1) {
      lines.push([
        `Last session was ${((lastVol / prevVol - 1) * 100).toFixed(0)}% heavier than before — you're progressing! 📈`,
        "Keep that progressive overload. Small jumps every session add up to huge gains."
      ]);
    } else {
      lines.push([
        `${sessionCount} session${sessionCount !== 1 ? 's' : ''} logged. Consistency is the real superpower. ⚡`,
        "Every rep logged is a data point moving you toward your goal. Keep showing up."
      ]);
    }
  }

  const [headline, subtitle] = lines[0];

  // Conversation States
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([
    { role: 'coach', text: "مرحباً بك بطل! أنا مدربك الشخصي المدعوم بالذكاء الاصطناعي من OmniBody. كيف يمكنني مساعدتك في تحقيق أهدافك البدنية والغذائية اليوم؟" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          context: {
            profile,
            history: history.slice(-5), // last 5 sessions for weight progression
            acwr,
            totalCal,
            targetCal,
            supplements: profile.supplements,
            injuries: profile.injuries
          }
        })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: 'coach', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'coach', text: "عذراً بطل، لم أستطع فهم ذلك بسبب خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً." }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'coach', text: "عذراً بطل، لم أستطع فهم ذلك بسبب خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="glass-card animate-fade-up"
        style={{
          padding: '1.25rem', marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(0,240,255,0.04) 0%, rgba(255,0,110,0.03) 100%)',
          borderLeft: '3px solid var(--cyan)',
          position: 'relative', overflow: 'hidden', cursor: 'pointer'
        }}
        onClick={() => setShowChat(true)}
      >
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -24, right: -24,
          width: 90, height: 90,
          background: 'var(--cyan-glow)', borderRadius: '50%',
          filter: 'blur(24px)', pointerEvents: 'none', opacity: 0.5,
        }} />

        {/* Label row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--cyan), var(--magenta))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px var(--cyan-glow)',
            }}>
              <Brain size={13} color="#000" />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              AI Coach
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'rgba(0,240,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: 4, fontWeight: 700 }}>
            استشر المدرب 💬
          </span>
        </div>

        {/* Caveat handwriting text */}
        <p style={{
          fontFamily: 'var(--font-handwriting)',
          fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.35,
          color: 'var(--color-text)', margin: '0 0 0.3rem',
          position: 'relative', zIndex: 1,
        }}>
          {headline}
        </p>
        <p style={{
          fontFamily: 'var(--font-handwriting)',
          fontSize: '1.1rem', fontWeight: 400, lineHeight: 1.4,
          color: 'var(--color-text-muted)', margin: 0,
          position: 'relative', zIndex: 1,
        }}>
          {subtitle}
        </p>
      </div>

      {/* Interactive Coach Dialog Modal */}
      {showChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '480px', height: '80vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--cyan)', borderBottom: 'none' }}>
            
            {/* Chat Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--magenta))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,240,255,0.4)' }}>
                  <Brain size={16} color="#000" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>OmniBody Coach AI</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--cyan)' }}>متصل ومستعد لتحليل تدريبك ونظامك الغذائي</div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  {m.role === 'coach' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cyan)', flexShrink: 0 }}>
                      <Brain size={11} color="var(--cyan)" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%',
                    padding: '0.75rem 1rem',
                    borderRadius: 12,
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'var(--cyan)' : 'rgba(255,255,255,0.04)',
                    color: m.role === 'user' ? '#000' : '#fff',
                    fontWeight: m.role === 'user' ? 600 : 400,
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cyan)' }}>
                    <Loader2 size={11} className="animate-spin" color="var(--cyan)" />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>جاري التفكير والكتابة...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <input
                type="text"
                placeholder="اسأل المدرب عن إصابتك، تمارينك أو الكالوري..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 12, color: '#fff', fontSize: '0.85rem' }}
              />
              <button onClick={handleSendMessage} disabled={loading} style={{
                background: 'var(--cyan)', border: 'none', width: '38px', height: '38px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                <Send size={16} />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const t           = useT();
  const profile     = useUserStore(s => s.profile);
  const history     = useWorkoutStore(s => s.history);
  const volumeSpike = useWorkoutStore(s => s.volumeSpikeWarning);
  const nutritionHistory = useNutritionStore(s => s.history);
  const getTodayLog = useNutritionStore(s => s.getTodayLog);
  const getTargets  = useNutritionStore(s => s.getTargets);
  const { xp, level, badges } = useGamificationStore();
  const navigate    = useNavigate();

  const todayStr = startOfDay(new Date()).getTime();
  const todayLog = nutritionHistory[todayStr] || getTodayLog();
  const targets  = getTargets(profile.weight);

  let totalCal = 0, totalPro = 0;
  todayLog.meals.forEach(m => m.foods.forEach(f => { totalCal += f.calories; totalPro += f.protein; }));

  const lastSession   = history.length > 0 ? history[history.length - 1] : null;
  const unlockedCount = badges.filter(b => b.unlocked).length;
  const waterPercent  = Math.min(100, (todayLog.waterMl / targets.water) * 100);

  const handleShare = async () => {
    const target = document.getElementById('dashboard-export-target');
    if (!target) return;
    try {
      const canvas = await html2canvas(target, { backgroundColor: '#0f172a' });
      const dataUrl = canvas.toDataURL('image/png');

      if (Capacitor.isNativePlatform()) {
        // On Android/iOS: use native share sheet
        const base64 = dataUrl.split(',')[1];
        const fileName = `Omnibody-Stats-${format(new Date(), 'yyyy-MM-dd')}.png`;
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
        await Share.share({
          title: 'OmniBody Stats',
          text: 'Check out my fitness stats!',
          url: fileUri.uri,
          dialogTitle: 'Share your stats',
        });
      } else {
        // Fallback for browser
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Omnibody-Stats-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.click();
      }
    } catch (err) {
      console.error('Failed to generate share image', err);
    }
  };

  // ACWR
  let acwr = 1.0;
  if (history.length > 5) {
    const recent  = history.slice(-3).reduce((acc, s) => acc + s.totalVolume, 0) / 3;
    const chronic = history.reduce((acc, s) => acc + s.totalVolume, 0) / history.length;
    acwr = chronic > 0 ? recent / chronic : 1.0;
  }
  const acwrColor  = acwr > 1.3 ? 'var(--magenta)' : acwr < 0.8 ? 'var(--color-warning)' : 'var(--color-success)';
  const acwrStatus = acwr > 1.3 ? t('dash.danger_zone') : acwr < 0.8 ? t('dash.detraining') : t('dash.sweet_spot');

  return (
    <div className="page pb-24" id="dashboard-export-target">

      {/* Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-label">{t('dash.overview')}</div>
          <h1 className="display" style={{ fontSize: '2rem' }}>
            {t('dash.hello')}, <span className="neon-cyan">{profile.name.toUpperCase()}</span>
          </h1>
        </div>
        <button
          onClick={() => navigate('/profile')}
          style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=0f172a`}
            alt="Avatar" width={32} height={32} style={{ borderRadius: '50%' }}
          />
        </button>
      </header>

      {/* Volume spike warning */}
      {volumeSpike && (
        <div className="alert-warning" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} />
          <div>{t('dash.volume_spike')}</div>
        </div>
      )}

      {/* XP Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <XPBar xp={xp} level={level} />
      </div>

      {/* AI Coach Insight */}
      <AICoachInsight
        history={history}
        acwr={acwr}
        totalCal={totalCal}
        targetCal={targets.calories}
        sessionCount={history.length}
      />

      {/* Stats Row */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: t('dash.sessions'), val: history.length,                                                   icon: <Dumbbell   size={16} color="var(--cyan)"    />, color: 'var(--cyan)'    },
          { label: t('dash.badges'),   val: `${unlockedCount}/${badges.length}`,                               icon: <Zap        size={16} color="var(--gold)"    />, color: 'var(--gold)'    },
          { label: t('dash.volume'),   val: lastSession ? `${lastSession.totalVolume.toLocaleString()}` : '—', icon: <TrendingUp size={16} color="var(--magenta)" />, color: 'var(--magenta)' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className="glass-card animate-fade-up" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Volume Calculator */}
      <VolumeCalculator />

      {/* Analytics & Body Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          className="glass-card"
          style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/muscles')}
        >
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Accessibility size={14} /> {t('dash.anatomy')}
          </div>
          <button className="btn-primary" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem' }}>
            {t('dash.open_map')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} /> {t('dash.fatigue')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, color: acwrColor }}>
              {acwr.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{acwrStatus}</div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' }}
            onClick={handleShare}
          >
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Share2 size={14} /> {t('dash.export')}
            </div>
            <button className="btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem' }}>
              {t('dash.generate_share')}
            </button>
          </div>
        </div>
      </div>

      {/* Last Workout */}
      <div
        className="glass-card animate-fade-up"
        style={{ padding: '1.25rem', marginBottom: '1.25rem', cursor: 'pointer' }}
        onClick={() => navigate('/workout')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="section-label">{t('dash.workout')}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
              {lastSession ? lastSession.type : t('dash.start_first')}
            </div>
            {lastSession && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                Volume: {lastSession.totalVolume.toLocaleString()}kg · {format(new Date(lastSession.date), 'MMM d')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--cyan), #0080ff)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-cyan)' }}>
              <Dumbbell size={22} color="#000" />
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>
        </div>
      </div>

      {/* Nutrition Today */}
      <div
        className="glass-card animate-fade-up"
        style={{ padding: '1.25rem', marginBottom: '1.25rem', cursor: 'pointer' }}
        onClick={() => navigate('/nutrition')}
      >
        <div className="section-label">{t('dash.nutrition')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: t('dash.calories'), current: Math.round(totalCal), target: targets.calories, unit: 'kcal', color: 'linear-gradient(90deg,var(--cyan),#0080ff)' },
            { label: t('dash.protein'),  current: Math.round(totalPro), target: targets.protein,  unit: 'g',    color: 'linear-gradient(90deg,#00ff88,var(--cyan))' },
          ].map(({ label, current, target, unit, color }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{current}/{target}{unit}</span>
              </div>
              <div className="macro-bar-track">
                <div className="macro-bar-fill" style={{ width: `${Math.min(100, (current / target) * 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <Droplet size={14} color="var(--cyan)" />
          <div className="macro-bar-track" style={{ flex: 1, height: 6 }}>
            <div className="macro-bar-fill" style={{ width: `${waterPercent}%`, background: 'linear-gradient(90deg, var(--cyan), #0044ff)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {todayLog.waterMl}ml
          </span>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
