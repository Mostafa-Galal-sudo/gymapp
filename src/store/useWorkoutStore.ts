import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGamificationStore } from './useGamificationStore';

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  notes: string;
  voiceNotes: string[];
}

export interface WorkoutSession {
  sessionId: string;
  date: number; // timestamp
  type: string; // e.g. "Push A"
  exercises: WorkoutExercise[];
  totalVolume: number;
  phase: 'warmup' | 'main' | 'cooldown';
  isFinished: boolean;
}

export interface ScheduledSession {
  id: string;
  date: string; // YYYY-MM-DD
  type: string; // e.g. "Push A"
  exerciseIds: string[];
}

interface WorkoutState {
  history: WorkoutSession[];
  activeSession: WorkoutSession | null;
  scheduledSessions: ScheduledSession[];
  suggestDeload: boolean;
  volumeSpikeWarning: boolean;
  startSession: (type: string, exerciseIds: string[]) => void;
  updateSet: (exerciseId: string, setNumber: number, data: Partial<WorkoutSet>) => void;
  updateNotes: (exerciseId: string, notes: string) => void;
  addVoiceNote: (exerciseId: string, voiceNote: string) => void;
  swapExercise: (oldId: string, newId: string) => void;
  addExerciseToSession: (exerciseId: string) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  setPhase: (phase: 'warmup' | 'main' | 'cooldown') => void;
  finishSession: () => void;
  getSuggestedWeight: (exerciseId: string) => number;
  importData: (data: any) => void;
  scheduleSession: (date: string, type: string, exerciseIds: string[]) => void;
  removeScheduledSession: (id: string) => void;
  updateScheduledSessionDate: (id: string, newDate: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      history: [],
      activeSession: null,
      scheduledSessions: [],
      suggestDeload: false,
      volumeSpikeWarning: false,

      scheduleSession: (date, type, exerciseIds) => set((state) => ({
        scheduledSessions: [...state.scheduledSessions, { id: generateId(), date, type, exerciseIds }]
      })),

      removeScheduledSession: (id) => set((state) => ({
        scheduledSessions: state.scheduledSessions.filter(s => s.id !== id)
      })),

      updateScheduledSessionDate: (id, newDate) => set((state) => ({
        scheduledSessions: state.scheduledSessions.map(s => s.id === id ? { ...s, date: newDate } : s)
      })),

      startSession: (type, exerciseIds) => {
        const exercises: WorkoutExercise[] = exerciseIds.map(id => {
          // Find suggested weight from history
          const suggestedWeight = get().getSuggestedWeight(id);
          return {
            exerciseId: id,
            notes: '',
            voiceNotes: [],
            sets: [
              { setNumber: 1, weight: suggestedWeight, reps: 0, rpe: 0, completed: false },
              { setNumber: 2, weight: suggestedWeight, reps: 0, rpe: 0, completed: false },
              { setNumber: 3, weight: suggestedWeight, reps: 0, rpe: 0, completed: false }
            ]
          };
        });

        set({
          activeSession: {
            sessionId: generateId(),
            date: Date.now(),
            type,
            exercises,
            totalVolume: 0,
            phase: 'warmup',
            isFinished: false,
          }
        });
      },

      updateSet: (exerciseId, setNumber, data) => set((state) => {
        if (!state.activeSession) return state;
        const exercises = state.activeSession.exercises.map(ex => {
          if (ex.exerciseId !== exerciseId) return ex;
          const sets = ex.sets.map(s => {
            if (s.setNumber !== setNumber) return s;
            return { ...s, ...data };
          });
          return { ...ex, sets };
        });
        return { activeSession: { ...state.activeSession, exercises } };
      }),

      updateNotes: (exerciseId, notes) => set((state) => {
        if (!state.activeSession) return state;
        const exercises = state.activeSession.exercises.map(ex => {
          if (ex.exerciseId !== exerciseId) return ex;
          return { ...ex, notes };
        });
        return { activeSession: { ...state.activeSession, exercises } };
      }),

      addVoiceNote: (exerciseId, voiceNote) => set((state) => {
        if (!state.activeSession) return state;
        const exercises = state.activeSession.exercises.map(ex => {
          if (ex.exerciseId !== exerciseId) return ex;
          return { ...ex, voiceNotes: [...ex.voiceNotes, voiceNote] };
        });
        return { activeSession: { ...state.activeSession, exercises } };
      }),

      swapExercise: (oldId, newId) => set((state) => {
        if (!state.activeSession) return state;
        const exercises = state.activeSession.exercises.map(ex => {
          if (ex.exerciseId !== oldId) return ex;
          return { ...ex, exerciseId: newId }; // keep sets and notes, just swap ID
        });
        return { activeSession: { ...state.activeSession, exercises } };
      }),

      addExerciseToSession: (exerciseId) => set((state) => {
        if (!state.activeSession) return state;
        const suggestedWeight = get().getSuggestedWeight(exerciseId);
        const newExercise = {
          exerciseId,
          notes: '',
          voiceNotes: [],
          sets: [
            { setNumber: 1, weight: suggestedWeight, reps: 0, rpe: 0, completed: false },
            { setNumber: 2, weight: suggestedWeight, reps: 0, rpe: 0, completed: false },
            { setNumber: 3, weight: suggestedWeight, reps: 0, rpe: 0, completed: false }
          ]
        };
        return { activeSession: { ...state.activeSession, exercises: [...state.activeSession.exercises, newExercise] } };
      }),

      removeExerciseFromSession: (exerciseId) => set((state) => {
        if (!state.activeSession) return state;
        const exercises = state.activeSession.exercises.filter(ex => ex.exerciseId !== exerciseId);
        return { activeSession: { ...state.activeSession, exercises } };
      }),

      setPhase: (phase) => set((state) => {
        if (!state.activeSession) return state;
        return { activeSession: { ...state.activeSession, phase } };
      }),

      finishSession: () => set((state) => {
        if (!state.activeSession) return state;
        
        let totalVolume = 0;
        let setsCompleted = 0;
        state.activeSession.exercises.forEach(ex => {
          ex.sets.forEach(s => {
            if (s.completed && s.weight > 0 && s.reps > 0) {
              totalVolume += (s.weight * s.reps);
              setsCompleted += 1;
            }
          });
        });

        // Gamification integration (static import)
        const gamification = useGamificationStore.getState();
        gamification.addXP(totalVolume * 0.1 + setsCompleted * 10);
        gamification.unlockBadge('first_workout');
        const currentHour = new Date().getHours();
        if (currentHour < 8) gamification.unlockBadge('early_bird');
        if (currentHour >= 20) gamification.unlockBadge('night_owl');

        const finishedSession = { 
          ...state.activeSession, 
          isFinished: true, 
          totalVolume 
        };

        const newHistory = [...state.history, finishedSession];

        // Volume Spike Warning
        let volumeSpikeWarning = false;
        if (newHistory.length >= 2) {
          const lastSession = newHistory[newHistory.length - 1];
          const prevSession = newHistory[newHistory.length - 2];
          if (lastSession.totalVolume > prevSession.totalVolume * 1.2) {
            volumeSpikeWarning = true;
          }
        }

        return {
          history: newHistory,
          activeSession: null,
          suggestDeload: false,
          volumeSpikeWarning
        };
      }),

      getSuggestedWeight: (exerciseId) => {
        const history = get().history;
        // Find last session that had this exercise
        for (let i = history.length - 1; i >= 0; i--) {
          const ex = history[i].exercises.find(e => e.exerciseId === exerciseId);
          if (ex) {
            // Check if all sets were completed with RPE < 9 and high reps
            const completedSets = ex.sets.filter(s => s.completed);
            if (completedSets.length > 0) {
              const maxWeight = Math.max(...completedSets.map(s => s.weight));
              const allHighReps = completedSets.every(s => s.reps >= 10);
              // Simple double progression logic: if hit 10+ reps on all sets, suggest +2.5kg
              if (allHighReps) {
                return maxWeight + 2.5;
              }
              return maxWeight; // Keep same weight
            }
          }
        }
        return 0; // Default if no history
      },
      
      importData: (data) => set({ 
        history: data.history || [], 
        activeSession: data.activeSession || null,
        scheduledSessions: data.scheduledSessions || []
      })
    }),
    {
      name: 'omnibody-workout-storage',
    }
  )
);
