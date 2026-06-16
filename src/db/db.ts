import Dexie, { type EntityTable } from 'dexie';
import { type UserProfile, type Supplement, type WeightEntry } from '../store/useUserStore';
import { type WorkoutSession } from '../store/useWorkoutStore';
import { type CustomExercise } from '../store/useExerciseStore';
import { type Meal } from '../store/useNutritionStore';

export interface InjuryEntry {
  id: string;
  userId: string;
  bodyPart: string;
  severity: number;
  status: 'Active' | 'Recovering' | 'Healed';
  notes: string;
  dateLogged: number;
}

export interface UserEntity {
  id: string;
  profile: UserProfile;
  supplements: Supplement[];
  weightHistory: WeightEntry[];
}

export interface DailyLogEntity {
  id: string; // Composite key: `${userId}_${date}`
  userId: string;
  date: number; // Start of day timestamp
  meals: Meal[];
  waterMl: number;
  supplementsTaken: Record<string, boolean[]>; // supplementId -> boolean array of taken doses
}

// Extend WorkoutSession and CustomExercise to include userId for the DB layer
export type DBWorkoutSession = WorkoutSession & { userId: string };
export type DBCustomExercise = CustomExercise & { userId: string };

const db = new Dexie('OmnibodyDB_V2') as Dexie & {
  users: EntityTable<UserEntity, 'id'>;
  daily_logs: EntityTable<DailyLogEntity, 'id'>;
  workouts: EntityTable<DBWorkoutSession, 'sessionId'>;
  custom_exercises: EntityTable<DBCustomExercise, 'id'>;
  injuries: EntityTable<InjuryEntry, 'id'>;
};

// Schema version 2 (V2)
db.version(2).stores({
  users: 'id',
  daily_logs: 'id, userId, date, [userId+date]', 
  workouts: 'sessionId, userId, date, type, phase',
  custom_exercises: 'id, userId, name, category, muscleGroup',
  injuries: 'id, userId, bodyPart, status'
});

export default db;
