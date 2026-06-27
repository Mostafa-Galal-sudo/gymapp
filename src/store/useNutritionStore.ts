import { create } from 'zustand';
import { startOfDay } from 'date-fns';
import db from '../db/db';
import { useUserStore } from './useUserStore';
import { FOOD_DATABASE } from '../data/foods';
import { scheduleWaterReminders, cancelWaterReminders } from '../services/notificationService';

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
  getTargets: (weight?: number) => { 
    calories: number; protein: number; carbs: number; fats: number; fiber: number; water: number;
    sodium: number; potassium: number; iron: number; calcium: number;
    vitaminA: number; vitaminC: number; vitaminD: number; vitaminB12: number;
  };
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
  getLogForDate: (date: number) => NutritionDay;
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

    getTargets: (weightParam?: number) => {
      const profile = useUserStore.getState().profile;
      const weight = weightParam || profile.weight || 78;
      const height = profile.height || 177;
      const age = profile.age || 22;
      const goals = profile.goals || [];
      const activityLevel = profile.activityLevel || 'Moderate';

      const isFemale = goals.some(g => g.toLowerCase().includes('female')) || (profile as any).gender === 'female';
      const s = isFemale ? -161 : 5;
      const bmr = 10 * weight + 6.25 * height - 5 * age + s;

      const multiplierMap: Record<string, number> = {
        'Sedentary': 1.2,
        'Light': 1.375,
        'Moderate': 1.55,
        'Active': 1.725,
      };
      const multiplier = multiplierMap[activityLevel] ?? 1.55;

      const tdee = bmr * multiplier;

      let calories = tdee;
      if (goals.some(g => g.toLowerCase().includes('loss') || g.toLowerCase().includes('cut') || g.toLowerCase().includes('aesthetics'))) {
        calories = tdee - 500;
      } else if (goals.some(g => g.toLowerCase().includes('strength') || g.toLowerCase().includes('bulk') || g.toLowerCase().includes('mass') || g.toLowerCase().includes('athletic'))) {
        calories = tdee + 300;
      }

      calories = Math.round(calories);

      const proteinG = Math.round(weight * 2.0);
      const proteinKcal = proteinG * 4;
      const fatsG = Math.round(weight * 1.0);
      const fatsKcal = fatsG * 9;
      const remainingKcal = calories - proteinKcal - fatsKcal;
      const carbsG = Math.round(Math.max(50, remainingKcal / 4));

      const fiberG = 30;
      const waterMl = Math.round(weight * 35);

      return {
        calories,
        protein: proteinG,
        carbs: carbsG,
        fats: fatsG,
        fiber: fiberG,
        water: waterMl,
        sodium: 2300,        // mg (general upper limit / target)
        potassium: 3400,     // mg
        iron: isFemale ? 18 : 8, // mg
        calcium: 1000,       // mg
        vitaminA: isFemale ? 700 : 900, // mcg
        vitaminC: isFemale ? 75 : 90,   // mg
        vitaminD: 600,       // IU
        vitaminB12: 2.4      // mcg
      };
    },


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
      return get().getLogForDate(today);
    },

    getLogForDate: (date: number) => {
      const targetDate = startOfDay(new Date(date)).getTime();
      const history = get().history;
      if (!history[targetDate]) {
        return {
          date: targetDate,
          waterMl: 0,
          meals: [
            { id: generateId(), type: 'Breakfast', foods: [] },
            { id: generateId(), type: 'Lunch', foods: [] },
            { id: generateId(), type: 'Dinner', foods: [] },
            { id: generateId(), type: 'Snacks', foods: [] },
            { id: generateId(), type: 'Pre-workout', foods: [] },
            { id: generateId(), type: 'Post-workout', foods: [] }
          ],
          supplementsTaken: {}
        };
      }
      return history[targetDate];
    },

    addFood: async (date, mealType, food) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getLogForDate(today);
      
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
      const dayLog = get().history[today] || get().getLogForDate(today);
      
      const newLog = { ...dayLog, waterMl: dayLog.waterMl + amount };
      set((state) => ({
        history: { ...state.history, [today]: newLog }
      }));

      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);

      // Handle water reminders if logging for today
      if (today === startOfDay(new Date()).getTime()) {
        const target = get().getTargets(useUserStore.getState().profile.weight).water;
        if (newLog.waterMl >= target) {
          cancelWaterReminders();
        } else {
          scheduleWaterReminders(target - newLog.waterMl);
        }
      }
    },

    toggleSupplement: async (date, supId, doseIndex) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getLogForDate(today);
      
      const supsTaken = { ...(dayLog.supplementsTaken || {}) };
      const doses = [...(supsTaken[supId] || [])];
      
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
      const dayLog = get().history[today] || get().getLogForDate(today);
      
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
      const dayLog = get().history[today] || get().getLogForDate(today);
      
      const newLog = { ...dayLog, waterMl: 0 };
      set((state) => ({ history: { ...state.history, [today]: newLog } }));
      
      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);

      if (today === startOfDay(new Date()).getTime()) {
        const target = get().getTargets(useUserStore.getState().profile.weight).water;
        scheduleWaterReminders(target);
      }
    },

    resetSupplements: async (date) => {
      const today = startOfDay(new Date(date)).getTime();
      const dayLog = get().history[today] || get().getLogForDate(today);
      
      const newLog = { ...dayLog, supplementsTaken: {} };
      set((state) => ({ history: { ...state.history, [today]: newLog } }));
      
      const activeUserId = useUserStore.getState().activeUserId;
      if (activeUserId) await saveToDb(activeUserId, today, newLog);
    }
  })
);
