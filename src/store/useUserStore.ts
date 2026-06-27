import { create } from 'zustand';
import db, { type InjuryEntry } from '../db/db';

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  timing: string;
  taken: boolean[]; // Array of booleans for multiple doses (used to define how many doses are needed)
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  level: string;
  goals: string[];
  profilePhoto?: string;
  activityLevel?: 'Sedentary' | 'Light' | 'Moderate' | 'Active';
  gender?: 'male' | 'female';
}

export interface WeightEntry {
  date: number;
  weight: number;
}

interface UserState {
  activeUserId: string | null;
  profile: UserProfile;
  supplements: Supplement[];
  weightHistory: WeightEntry[];
  injuries: InjuryEntry[];
  isAuthenticated: boolean;
  loadUser: (userId: string) => Promise<void>;
  createUser: (userId: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logWeight: (weight: number) => Promise<void>;
  addSupplement: (supplement: Supplement) => Promise<void>;
  deleteSupplement: (id: string) => Promise<void>;
  addInjury: (injury: Omit<InjuryEntry, 'id' | 'userId' | 'dateLogged'>) => Promise<void>;
  deleteInjury: (id: string) => Promise<void>;
}

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: 'cal_d', name: 'Cal-D', dose: '2 tabs', timing: 'Morning with breakfast', taken: [false] },
  { id: 'omega3', name: 'Omega-3', dose: '4 caps', timing: 'Morning + Evening', taken: [false, false] },
  { id: 'creatine', name: 'Creatine', dose: '5g', timing: 'Morning with breakfast', taken: [false] },
  { id: 'ashwagandha', name: 'Ashwagandha', dose: '300mg', timing: 'Evening with dinner', taken: [false] },
  { id: 'vit_d3', name: 'Vitamin D3', dose: '2000 IU', timing: 'After lunch', taken: [false] },
  { id: 'magnesium', name: 'Magnesium', dose: '200mg', timing: 'Evening before bed', taken: [false] },
];

const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  age: 25,
  weight: 70,
  height: 175,
  level: 'Beginner',
  goals: ['General Fitness'],
  activityLevel: 'Moderate',
  gender: 'male',
};

const saveToDb = async (state: UserState) => {
  const userId = state.activeUserId || 'default_user';
  await db.users.put({
    id: userId,
    profile: state.profile,
    supplements: state.supplements,
    weightHistory: state.weightHistory
  });
};

export const useUserStore = create<UserState>()((set, get) => ({
  activeUserId: null,
  profile: DEFAULT_PROFILE,
  supplements: DEFAULT_SUPPLEMENTS,
  weightHistory: [],
  injuries: [],
  isAuthenticated: false,

  loadUser: async (userId: string) => {
    const id = userId || 'default_user';
    const user = await db.users.get(id);
    const injuries = await db.injuries.where('userId').equals(id).toArray();
    if (user) {
      localStorage.setItem('omni_active_user', id);
      set({
        activeUserId: id,
        profile: user.profile,
        supplements: user.supplements || DEFAULT_SUPPLEMENTS,
        weightHistory: user.weightHistory || [],
        injuries: injuries || [],
        isAuthenticated: true
      });
    } else {
      await get().createUser(id, 'User');
    }
  },

  createUser: async (userId: string, name: string) => {
    const id = userId || 'default_user';
    const profile = { ...DEFAULT_PROFILE, name };
    const weightHistory = [{ date: Date.now(), weight: profile.weight }];
    await db.users.put({
      id,
      profile,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory
    });
    localStorage.setItem('omni_active_user', id);
    set({
      activeUserId: id,
      profile,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory,
      injuries: [],
      isAuthenticated: true
    });
  },

  logout: () => {
    localStorage.removeItem('omni_active_user');
    set({
      activeUserId: null,
      isAuthenticated: false,
      profile: DEFAULT_PROFILE,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory: [],
      injuries: []
    });
  },

  updateProfile: async (updates) => {
    const state = get();
    const newProfile = { ...state.profile, ...updates };
    set({ profile: newProfile });
    await saveToDb({ ...state, profile: newProfile });
  },

  logWeight: async (weight) => {
    const state = get();
    const newProfile = { ...state.profile, weight };
    const newHistory = [...state.weightHistory, { date: Date.now(), weight }];
    set({ profile: newProfile, weightHistory: newHistory });
    await saveToDb({ ...state, profile: newProfile, weightHistory: newHistory });
  },

  addSupplement: async (supplement: Supplement) => {
    const state = get();
    const newSupplements = [...state.supplements, supplement];
    set({ supplements: newSupplements });
    await saveToDb({ ...state, supplements: newSupplements });
  },

  deleteSupplement: async (id: string) => {
    const state = get();
    const newSupplements = state.supplements.filter(s => s.id !== id);
    set({ supplements: newSupplements });
    await saveToDb({ ...state, supplements: newSupplements });
  },

  addInjury: async (injury) => {
    const state = get();
    const id = Math.random().toString(36).substring(2, 9);
    const userId = state.activeUserId || 'default_user';
    const newEntry: InjuryEntry = {
      ...injury,
      id,
      userId,
      dateLogged: Date.now()
    };
    await db.injuries.put(newEntry);
    set({ injuries: [...state.injuries, newEntry] });
  },

  deleteInjury: async (id: string) => {
    await db.injuries.delete(id);
    set(state => ({ injuries: state.injuries.filter(i => i.id !== id) }));
  }
}));
