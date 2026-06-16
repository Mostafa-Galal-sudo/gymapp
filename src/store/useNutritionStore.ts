import { create } from 'zustand';
import { startOfDay } from 'date-fns';
import db from '../db/db';
import { useUserStore } from './useUserStore';
import { FOOD_DATABASE } from '../data/foods';

export interface LoggedFood {
  foodId: string;
  name: string;
  nameAr?: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  iron?: number;
  calcium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminB12?: number;
}

export interface Meal {
  id: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Pre-workout' | 'Post-workout';
  foods: LoggedFood[];
}

export interface NutritionDay {
  date: number; // Start of day timestamp
  meals: Meal[];
  waterMl: number;
  supplementsTaken?: Record<string, boolean[]>;
}

interface NutritionState {
  history: Record<number, NutritionDay>; // Keyed by start of day timestamp
  getTargets: (weight: number) => { calories: number; protein: number; carbs: number; fats: number; fiber: number; water: number };
  loadUserHistory: (userId: string) => Promise<void>;
  addFood: (date: number, mealType: string, food: LoggedFood) => Promise<void>;
  removeFood: (date: number, mealId: string, foodId: string) => Promise<void>;
  addWater: (date: number, amount: number) => Promise<void>;
  toggleSupplement: (date: number, supId: string, doseIndex: number) => Promise<void>;
  resetMeal: (date: number, mealType: string) => Promise<void>;
  resetWater: (date: number) => Promise<void>;
  resetSupplements: (date: number) => Promise<void>;
  resetDay: (date: number) => Promise<void>;
  getTodayLog: () => NutritionDay;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const saveToDb = async (userId: string, date: number, dayLog: NutritionDay) => {
  await db.daily_logs.put({
    id: `${userId}_${date}`,
    userId,
    date,
    meals: dayLog.meals,
    waterMl: dayLog.waterMl,
    supplementsTaken: dayLog.supplementsTaken || {}
  });
};

export const useNutritionStore = create<NutritionState>()(
  (set, get) => ({
    history: {},

    getTargets: (weight: number) => ({
      calories: 3200,
      protein: Math.round(weight * 2.05), // ~160g for 78kg
      carbs: 400,
      fats: 89,
      fiber: 30,
      water: 3500
    }),

    loadUserHistory: async (userId: string) => {
      const logs = await db.daily_logs.where('userId').equals(userId).toArray();
      const historyMap: Record<number, NutritionDay> = {};

      // Build a quick lookup map for O(1) food access
      const foodLookup = new Map(FOOD_DATABASE.map(f => [f.id, f]));

      logs.forEach(log => {
        const enrichedMeals = log.meals.map(meal => ({
          ...meal,
          foods: meal.foods.map(lf => {
            // Skip if already has micros
            if (lf.fiber != null || lf.sodium != null || lf.potassium != null) return lf;

            // Macro-based estimation (same formulas as handleAdd)
            const p = lf.protein, c = lf.carbs, f = lf.fats, cal = lf.calories;
            const est = {
              fiber:     parseFloat((c * 0.02  + p * 0.005).toFixed(1)),
              sugar:     parseFloat((c * 0.05).toFixed(1)),
              sodium:    Math.round(p * 6    + c * 0.5  + cal * 0.08),
              potassium: Math.round(p * 12   + c * 1.5  + f   * 0.5),
              iron:      parseFloat((p * 0.04 + c * 0.008).toFixed(1)),
              calcium:   Math.round(p * 0.6  + c * 0.1  + f   * 0.2),
              vitaminC:  Math.round(c * 0.15),
              vitaminA:  Math.round(f * 0.8),
              vitaminD:  parseFloat((f * 0.05).toFixed(1)),
            };

            // Try to use DB values if food is found (more accurate)
            const src = foodLookup.get(lf.foodId);
            if (src) {
              const ratio = lf.amount / src.servingSize;
              return {
                ...lf,
                fiber:     src.fiber     != null ? parseFloat((src.fiber     * ratio).toFixed(1)) : est.fiber,
                sugar:     src.sugar     != null ? parseFloat((src.sugar     * ratio).toFixed(1)) : est.sugar,
                sodium:    src.sodium    != null ? Math.round(src.sodium    * ratio)              : est.sodium,
                potassium: src.potassium != null ? Math.round(src.potassium * ratio)              : est.potassium,
                iron:      src.iron      != null ? parseFloat((src.iron      * ratio).toFixed(1)) : est.iron,
                calcium:   src.calcium   != null ? Math.round(src.calcium   * ratio)              : est.calcium,
                vitaminA:  src.vitaminA  != null ? Math.round(src.vitaminA  * ratio)              : est.vitaminA,
                vitaminC:  src.vitaminC  != null ? Math.round(src.vitaminC  * ratio)              : est.vitaminC,
                vitaminD:  src.vitaminD  != null ? Math.round(src.vitaminD  * ratio)              : est.vitaminD,
                vitaminB12: src.vitaminB12 != null ? parseFloat((src.vitaminB12 * ratio).toFixed(1)) : undefined,
              };
            }

            // Food not found in DB — use macro estimates directly
            return { ...lf, ...est };
          })
        }));

        historyMap[log.date] = {
          date: log.date,
          meals: enrichedMeals,
          waterMl: log.waterMl,
          supplementsTaken: log.supplementsTaken
        };
      });
      set({ history: historyMap });
    },

    getTodayLog: () => {
      const today = startOfDay(new Date()).getTime();
      const history = get().history;
      if (!history[today]) {
        return {
          date: today,
          waterMl: 0,
          meals: [
            { id: generateId(), type: 'Breakfast', foods: [] },
            { id: generateId(), type: 'Lunch', foods: [] },
            { id: generateId(), type: 'Dinner', foods: [] },
            { id: generateId(), type: 'Snacks', foods: [] }
          ],
          supplementsTaken: {}
        };
      }
      return history[today];
    },

    addFood: async (date, mealType, food) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      let meal = dayLog.meals.find(m => m.type === mealType);
      if (!meal) {
        meal = { id: generateId(), type: mealType as any, foods: [] };
        dayLog.meals.push(meal);
      }
      
      meal.foods.push(food);
      
      const newLog = { ...dayLog, meals: [...dayLog.meals] };
      set((state) => ({
        history: { ...state.history, [today]: newLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    removeFood: async (date, mealId, foodId) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today];
      if (!dayLog) return;

      const meals = dayLog.meals.map(m => {
        if (m.id !== mealId) return m;
        return { ...m, foods: m.foods.filter(f => f.foodId !== foodId) };
      });

      const newLog = { ...dayLog, meals };
      set((state) => ({
        history: { ...state.history, [today]: newLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    addWater: async (date, amount) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      const newLog = { ...dayLog, waterMl: dayLog.waterMl + amount };
      set((state) => ({
        history: { ...state.history, [today]: newLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    toggleSupplement: async (date, supId, doseIndex) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      const supsTaken = { ...(dayLog.supplementsTaken || {}) };
      const doses = [...(supsTaken[supId] || [])];
      
      // We might need to initialize the array length based on the actual supplement dose count
      // but we can just lazily expand it if needed.
      if (doseIndex >= doses.length) {
        for (let i = doses.length; i <= doseIndex; i++) doses[i] = false;
      }
      
      doses[doseIndex] = !doses[doseIndex];
      supsTaken[supId] = doses;

      const newLog = { ...dayLog, supplementsTaken: supsTaken };
      set((state) => ({
        history: { ...state.history, [today]: newLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    resetDay: async (date) => {
      const today = startOfDay(new Date(date)).getTime();
      const emptyLog = {
        date: today,
        waterMl: 0,
        supplementsTaken: {},
        meals: [
          { id: generateId(), type: 'Breakfast', foods: [] },
          { id: generateId(), type: 'Lunch', foods: [] },
          { id: generateId(), type: 'Dinner', foods: [] },
          { id: generateId(), type: 'Snacks', foods: [] },
          { id: generateId(), type: 'Pre-workout', foods: [] },
          { id: generateId(), type: 'Post-workout', foods: [] }
        ] as Meal[]
      };

      set((state) => ({
        history: { ...state.history, [today]: emptyLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, emptyLog);
    },

    resetMeal: async (date, mealType) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      const meals = dayLog.meals.map(m => {
        if (m.type === mealType) return { ...m, foods: [] };
        return m;
      });

      const newLog = { ...dayLog, meals };
      set((state) => ({ history: { ...state.history, [today]: newLog } }));
      
      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    resetWater: async (date) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      const newLog = { ...dayLog, waterMl: 0 };
      set((state) => ({ history: { ...state.history, [today]: newLog } }));
      
      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    },

    resetSupplements: async (date) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getTodayLog();
      
      const newLog = { ...dayLog, supplementsTaken: {} };
      set((state) => ({ history: { ...state.history, [today]: newLog } }));
      
      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    }
  })
);
