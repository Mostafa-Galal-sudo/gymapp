import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  timing: string;
  taken: boolean[]; // Array of booleans for multiple doses
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  level: string;
  goals: string[];
}

export interface WeightEntry {
  date: number;
  weight: number;
}

interface UserState {
  profile: UserProfile;
  supplements: Supplement[];
  weightHistory: WeightEntry[];
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleSupplement: (id: string, doseIndex: number) => void;
  resetSupplements: () => void;
  logWeight: (weight: number) => void;
  importData: (data: any) => void;
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

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      supplements: DEFAULT_SUPPLEMENTS,
      weightHistory: [{ date: Date.now() - 7 * 86400000, weight: 77.5 }, { date: Date.now(), weight: 78 }],
      isAuthenticated: true,
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false, profile: DEFAULT_PROFILE, supplements: DEFAULT_SUPPLEMENTS, weightHistory: [] }),
      updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
      toggleSupplement: (id, doseIndex) => set((state) => ({
        supplements: state.supplements.map((sup) => {
          if (sup.id === id) {
            const newTaken = [...sup.taken];
            newTaken[doseIndex] = !newTaken[doseIndex];
            return { ...sup, taken: newTaken };
          }
          return sup;
        })
      })),
      resetSupplements: () => set((state) => ({
        supplements: state.supplements.map(sup => ({ ...sup, taken: sup.taken.map(() => false) }))
      })),
      logWeight: (weight) => set((state) => ({
        profile: { ...state.profile, weight },
        weightHistory: [...state.weightHistory, { date: Date.now(), weight }]
      })),
      importData: (data) => set({ 
        profile: data.profile || DEFAULT_PROFILE, 
        supplements: data.supplements || DEFAULT_SUPPLEMENTS,
        weightHistory: data.weightHistory || []
      })
    }),
    {
      name: 'omnibody-user-storage',
    }
  )
);
