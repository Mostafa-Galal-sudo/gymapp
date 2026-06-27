import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useExerciseStore } from '../store/useExerciseStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useT } from '../hooks/useT';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, CheckCircle2, HeartPulse } from 'lucide-react';

const CalendarPage = () => {
  const t = useT();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  const history = useWorkoutStore(s => s.history);
  const scheduledSessions = useWorkoutStore(s => s.scheduledSessions);
  const scheduleSession = useWorkoutStore(s => s.scheduleSession);
  const removeScheduledSession = useWorkoutStore(s => s.removeScheduledSession);
  const getAllTemplates = useExerciseStore(s => s.getAllTemplates);
  const deviceSessions = useDeviceStore(s => s.sessions);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayStatus = (d: Date) => {
    const dStr = formatDateString(d);

    const completed = history.filter(h => {
      const hd = new Date(h.date);
      return formatDateString(hd) === dStr;
    });

    const scheduled = scheduledSessions.filter(s => s.date === dStr);

    const deviceDay = deviceSessions.filter(s => {
      const sd = new Date(s.date);
      return formatDateString(sd) === dStr;
    });

    return { completed, scheduled, deviceSessions: deviceDay };
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    setShowModal(true);
  };

  const renderDays = () => {
    const days = [];
    const todayStr = formatDateString(new Date());

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} style={{ opacity: 0.1 }}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dStr = formatDateString(d);
      const isToday = dStr === todayStr;

      const { completed, scheduled, deviceSessions: deviceDay } = getDayStatus(d);

      const hasCompleted = completed.length > 0;
      const hasScheduled = scheduled.length > 0;
      const hasDevice = deviceDay.length > 0;

      // Priority: completed > device > scheduled


      days.push(
        <div key={day} onClick={() => handleDayClick(day)}
          style={{
            aspectRatio: '1',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: isToday ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            border: isToday ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            position: 'relative',
            color: hasCompleted ? 'var(--cyan)' : 'var(--color-text)'
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>{day}</span>
          {/* Multi-dot row when multiple event types */}
          <div style={{ display: 'flex', gap: 3, position: 'absolute', bottom: '5px' }}>
            {hasCompleted && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)' }} />
            )}
            {hasDevice && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--magenta)' }} />
            )}
            {hasScheduled && !hasCompleted && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <>
      <div className="page" style={{ padding: '1rem 1rem 7rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <div className="section-label">{t('nav.calendar')}</div>
          <h1 className="display" style={{ fontSize: '2.5rem' }}>{t('nav.calendar')}</h1>
        </header>

        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.5rem' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 700, margin: 0 }}>
              {monthNames[month]} {year}
            </h2>
            <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.5rem' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {renderDays()}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }}></div>
            مكتمل
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--magenta)' }}></div>
            جلسة جارمن
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }}></div>
            مجدول
          </div>
        </div>
      </div>

      {showModal && selectedDate && (
        <DayModal
          date={selectedDate}
          onClose={() => setShowModal(false)}
          dayStatus={getDayStatus(selectedDate)}
          scheduleSession={scheduleSession}
          removeScheduledSession={removeScheduledSession}
          templates={getAllTemplates()}
        />
      )}
    </>
  );
};

// ── Device Session Card ───────────────────────────────────────────────────────
const DeviceSessionCard = ({ session }: { session: any }) => {
  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}د ${s % 60}ث`;

  const zonesWithTime = session.zones?.filter((z: any) => z.minutes > 0) ?? [];

  return (
    <div style={{
      background: 'rgba(255,0,85,0.05)', border: '1px solid rgba(255,0,85,0.2)',
      borderRadius: '12px', padding: '1rem', marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ fontWeight: 600, color: 'var(--magenta)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <HeartPulse size={16} /> {session.deviceName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {formatDuration(session.duration)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: zonesWithTime.length ? '0.75rem' : 0 }}>
        {[
          { label: 'متوسط', val: session.avgHR, color: 'var(--cyan)' },
          { label: 'أعلى', val: session.maxHR, color: 'var(--magenta)' },
          { label: 'أدنى', val: session.minHR, color: 'var(--gold)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{label} · bpm</div>
          </div>
        ))}
      </div>
      {zonesWithTime.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {zonesWithTime.map((z: any, i: number) => (
            <div key={i} style={{
              fontSize: '0.65rem', padding: '0.2rem 0.5rem',
              borderRadius: '999px', background: `${z.color}20`, color: z.color,
              border: `1px solid ${z.color}40`
            }}>
              {z.name} · {z.minutes.toFixed(1)}د
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Day Modal ─────────────────────────────────────────────────────────────────
const DayModal = ({ date, onClose, dayStatus, scheduleSession, removeScheduledSession, templates }: any) => {
  const t = useT();
  const [view, setView] = useState<'list' | 'add'>('list');
  const dStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

  const handleAdd = (name: string, ids: string[]) => {
    scheduleSession(dStr, name, ids);
    setView('list');
  };

  const hasAnything =
    dayStatus.completed.length > 0 ||
    dayStatus.scheduled.length > 0 ||
    dayStatus.deviceSessions.length > 0;

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(2, 4, 8, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-card)', borderTop: '1px solid rgba(0,240,255,0.1)',
        padding: '1.5rem', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
        maxHeight: '80vh', overflowY: 'auto', position: 'relative'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--color-text-muted)' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={22} className="neon-cyan" />
          {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h3>

        {view === 'list' ? (
          <>
            {!hasAnything && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {t('calendar.no_plans') || 'No workouts planned.'}
              </div>
            )}

            {/* Device sessions */}
            {dayStatus.deviceSessions.map((session: any) => (
              <DeviceSessionCard key={session.id} session={session} />
            ))}

            {/* Completed workout sessions */}
            {dayStatus.completed.map((session: any) => (
              <div key={session.sessionId} style={{
                background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px', padding: '1rem', marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={16} /> {session.type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Completed</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {session.exercises.length} Exercises · Vol: {session.totalVolume}kg
                </div>
              </div>
            ))}

            {/* Scheduled sessions */}
            {dayStatus.scheduled.map((session: any) => (
              <div key={session.id} style={{
                background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: '12px', padding: '1rem', marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{session.type}</div>
                  <button onClick={() => removeScheduledSession(session.id)} style={{ color: 'var(--magenta)', fontSize: '0.8rem' }}>Remove</button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {session.exerciseIds.length} Exercises Scheduled
                </div>
              </div>
            ))}

            <button onClick={() => setView('add')} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
              <Plus size={18} style={{ marginRight: '8px' }} /> {t('calendar.schedule_workout') || 'Schedule Workout'}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Select a template to schedule:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(templates).map(([name, ids]: any) => (
                <button key={name} onClick={() => handleAdd(name, ids)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '1rem', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ids.length} exercises</span>
                </button>
              ))}
            </div>
            <button onClick={() => setView('list')} className="btn-secondary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
              إلغاء
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default CalendarPage;