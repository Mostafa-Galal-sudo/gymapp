import { create } from 'zustand';
import db from '../db/db';

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
  isAuthenticated: boolean;
  loadUser: (userId: string) => Promise<void>;
  createUser: (userId: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logWeight: (weight: number) => Promise<void>;
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
  age: 22,
  weight: 78,
  height: 177,
  level: 'Intermediate',
  goals: ['Strength', 'Athletic', 'Aesthetics'],
};

const saveToDb = async (state: UserState) => {
  if (!state.activeUserId) return;
  await db.users.put({
    id: state.activeUserId,
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
  isAuthenticated: false,

  loadUser: async (userId: string) => {
    const user = await db.users.get(userId);
    if (user) {
      set({
        activeUserId: userId,
        profile: user.profile,
        supplements: user.supplements,
        weightHistory: user.weightHistory,
        isAuthenticated: true
      });
    }
  },

  createUser: async (userId: string, name: string) => {
    const profile = { ...DEFAULT_PROFILE, name };
    const weightHistory = [{ date: Date.now(), weight: profile.weight }];
    await db.users.put({
      id: userId,
      profile,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory
    });
    set({
      activeUserId: userId,
      profile,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory,
      isAuthenticated: true
    });
  },

  logout: () => {
    set({
      activeUserId: null,
      isAuthenticated: false,
      profile: DEFAULT_PROFILE,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory: []
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
  }
}));
