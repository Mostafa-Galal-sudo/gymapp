import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useExerciseStore } from '../store/useExerciseStore';
import db from '../db/db';
import { User, Plus } from 'lucide-react';
import { useT } from '../hooks/useT';

export const Auth = () => {
  const t = useT();
  const loadUser = useUserStore((s) => s.loadUser);
  const createUser = useUserStore((s) => s.createUser);
  const loadUserWorkouts = useWorkoutStore((s) => s.loadUserWorkouts);
  const loadUserHistory = useNutritionStore((s) => s.loadUserHistory);
  const loadUserGamification = useGamificationStore((s) => s.loadUserGamification);
  const loadUserExercises = useExerciseStore((s) => s.loadUserExercises);

  const [users, setUsers] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
    };
    fetchUsers();
  }, []);

  const handleSelectProfile = async (userId: string) => {
    await loadUser(userId);
    await loadUserWorkouts(userId);
    await loadUserHistory(userId);
    await loadUserGamification(userId);
    await loadUserExercises(userId);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newId = 'user_' + Date.now();
    await createUser(newId, newName.trim());
    await loadUserWorkouts(newId);
    await loadUserHistory(newId);
    await loadUserGamification(newId);
    await loadUserExercises(newId);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="display" style={{ fontSize: '3rem', letterSpacing: '0.1em' }}>
          <span className="neon-cyan">OMNI</span>BODY
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
          {t('auth.tagline') || 'Select your profile'}
        </p>
      </div>

      {!showNew ? (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSelectProfile(u.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: 80, height: 80, borderRadius: 16, background: 'var(--cyan)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
              }}>
                <User size={40} color="#000" />
              </div>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>{u.profile.name}</span>
            </button>
          ))}

          <button
            onClick={() => setShowNew(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              width: 80, height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,0.3)'
            }}>
              <Plus size={40} color="rgba(255,255,255,0.5)" />
            </div>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '1.1rem' }}>New Profile</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreateProfile} className="glass-card" style={{ width: '100%', maxWidth: '360px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', textAlign: 'center', marginBottom: '0.5rem' }}>Create Profile</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 8, color: '#fff' }}
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Start</button>
          <button type="button" onClick={() => setShowNew(false)} className="btn-secondary" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default Auth;
