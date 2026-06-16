import { useState } from 'react';
import { useNutritionStore } from '../store/useNutritionStore';
import type { LoggedFood, NutritionDay } from '../store/useNutritionStore';
import { useUserStore } from '../store/useUserStore';
import { startOfDay } from 'date-fns';
import { FOOD_DATABASE } from '../data/foods';
import type { Food } from '../data/foods';
import { useGamificationStore } from '../store/useGamificationStore';
import { Search, Plus, X, Droplet, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { useT } from '../hooks/useT';
import { useLanguageStore } from '../store/useLanguageStore';

// ── Macro Liquid Bar ──────────────────────────────────────────────────────────
const MacroBar = ({ label, current, target, gradient, unit = 'g' }: {
  label: string; current: number; target: number; gradient: string; unit?: string;
}) => {
  const pct = Math.min(100, (current / target) * 100);
  const over = pct >= 100;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: over ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
          {Math.round(current)}<span style={{ opacity: 0.5 }}>/{target}{unit}</span>
        </span>
      </div>
      <div className="macro-bar-track">
        <div className="macro-bar-fill"
          style={{ width: `${pct}%`, background: over ? 'linear-gradient(90deg,#ffaa00,#ff6600)' : gradient }}
        />
      </div>
    </div>
  );
};

// ── Water Bottle Visual ───────────────────────────────────────────────────────
const WaterBottle = ({ current, target }: { current: number; target: number }) => {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ position: 'relative', width: 36, height: 64, flexShrink: 0 }}>
        <svg viewBox="0 0 36 64" style={{ width: '100%', height: '100%' }}>
          {/* Bottle outline */}
          <rect x="10" y="0" width="16" height="8" rx="3" fill="rgba(0,240,255,0.15)" stroke="rgba(0,240,255,0.3)" strokeWidth="1"/>
          <rect x="4"  y="8" width="28" height="54" rx="6" fill="rgba(0,240,255,0.06)" stroke="rgba(0,240,255,0.25)" strokeWidth="1"/>
          {/* Water fill */}
          <clipPath id="bottleClip">
            <rect x="4" y="8" width="28" height="54" rx="6" />
          </clipPath>
          <rect x="4" y={8 + 54 * (1 - pct/100)} width="28" height={54 * pct/100} rx="0"
            fill="rgba(0,240,255,0.25)" clipPath="url(#bottleClip)"
            style={{ transition: 'y 0.6s ease, height 0.6s ease' }}
          />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Droplet size={14} color="var(--cyan)" />Water</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{current}ml <span style={{ opacity: 0.5 }}>/ {target}ml</span></span>
        </div>
        <div className="macro-bar-track">
          <div className="macro-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--cyan), #0044ff)' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          {[250, 500, 750].map(ml => (
            <button key={ml} onClick={() => addWaterFn(ml)}
              style={{
                flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                border: '1px solid rgba(0,240,255,0.2)', borderRadius: 'var(--radius-md)',
                color: 'var(--cyan)', background: 'rgba(0,240,255,0.05)',
                transition: 'all 0.2s',
              }}
            >+{ml}ml</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Temp global fn ref (passed via closure)
let addWaterFn = (_ml: number) => {};

// ── Supplement Checklist ──────────────────────────────────────────────────────
const Supplements = ({ todayLog, onReset }: { todayLog: NutritionDay, onReset: () => void }) => {
  const supplements = useUserStore(s => s.supplements);
  const toggleSupplement = useNutritionStore(s => s.toggleSupplement);
  const t = useT();

  const handleToggle = (supId: string, di: number, isTaken: boolean) => {
    toggleSupplement(todayLog.date, supId, di);
    if (!isTaken) useGamificationStore.getState().addXP(1);
  };

  if (!supplements || supplements.length === 0) return null;

  const supsTaken = todayLog.supplementsTaken || {};

  return (
    <div>
      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--magenta)' }}>{t('nutrition.supplements')}</span>
        <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="glass-card" style={{ padding: '1rem' }}>
        {supplements.map((sup, si) => {
          const takenArr = supsTaken[sup.id] || Array(sup.taken.length).fill(false);
          return (
            <div key={sup.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 0',
              borderBottom: si < supplements.length - 1 ? '1px solid rgba(0,240,255,0.06)' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sup.name}
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.8rem', marginInlineStart: '0.5rem' }}>{sup.dose}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>{sup.timing}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {sup.taken.map((_, di) => {
                  const isTaken = takenArr[di] || false;
                  return (
                    <button key={di} onClick={() => handleToggle(sup.id, di, isTaken)} style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: isTaken ? 'var(--color-success)' : 'rgba(0,240,255,0.05)',
                      border: `1px solid ${isTaken ? 'var(--color-success)' : 'rgba(0,240,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isTaken ? '0 0 8px rgba(0,255,136,0.4)' : 'none',
                      transition: 'all 0.2s',
                      color: isTaken ? '#000' : 'var(--color-text-muted)',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {isTaken ? <Check size={16} strokeWidth={3} /> : `${di+1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Nutrition Page ────────────────────────────────────────────────────────────
const FoodResultRow = ({ food, onAdd }: { food: Food, onAdd: (food: Food, quantity: number) => void }) => {
  const t = useT();
  const [qty, setQty] = useState(food.servingSize);
  const fName = useLanguageStore.getState().lang === 'ar' && food.nameAr ? food.nameAr : food.name;
  
  const categoryColor = (cat: string) => ({
    Local: 'var(--gold)', International: 'var(--magenta)',
    Raw: 'var(--color-success)', Supplement: 'var(--cyan)',
  }[cat] || 'var(--color-text-muted)');

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,240,255,0.06)'
    }}>
      <div style={{ flex: 1, paddingInlineEnd: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fName}</span>
          <span style={{ fontSize: '0.55rem', color: categoryColor(food.category), fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.1rem 0.3rem', border: `1px solid ${categoryColor(food.category)}`, borderRadius: 4 }}>
            {t(`nutrition.cat_${food.category.toLowerCase()}` as any) || food.category}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
          {food.calories}kcal · P:{food.protein}g · C:{food.carbs}g · F:{food.fats}g (per {food.servingSize}{food.servingUnit})
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '0.2rem', width: '70px' }}>
          <input 
            type="number" 
            value={qty || ''} 
            onChange={e => setQty(parseFloat(e.target.value) || 0)} 
            style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', textAlign: 'center', padding: 0 }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{food.servingUnit}</span>
        </div>
        <button onClick={() => onAdd(food, qty)} style={{
          background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.25)',
          borderRadius: 'var(--radius-full)', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cyan)'
        }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

const Nutrition = () => {
  const t            = useT();
  const profile      = useUserStore(s => s.profile);
  const getTodayLog  = useNutritionStore(s => s.getTodayLog);
  const historyData  = useNutritionStore(s => s.history);
  const getTargets   = useNutritionStore(s => s.getTargets);
  const addFood      = useNutritionStore(s => s.addFood);
  const removeFood   = useNutritionStore(s => s.removeFood);
  const addWater     = useNutritionStore(s => s.addWater);
  const resetMeal    = useNutritionStore(s => s.resetMeal);
  const resetWater   = useNutritionStore(s => s.resetWater);
  const resetSupplements = useNutritionStore(s => s.resetSupplements);
  const addXP        = useGamificationStore(s => s.addXP);
  const unlockBadge  = useGamificationStore(s => s.unlockBadge);

  const todayStr = startOfDay(new Date()).getTime();
  const todayLog = historyData[todayStr] || getTodayLog();
  const targets  = getTargets(profile.weight);
  addWaterFn     = (ml) => { addWater(todayLog.date, ml); };

  const [search, setSearch]       = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'raw'>('all');
  const [mealType, setMealType]   = useState('Breakfast');
  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({ Breakfast: true });
  const [showMicros, setShowMicros] = useState(false);

  let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFats = 0;
  let tFib = 0, tSug = 0, tSod = 0, tPot = 0, tIron = 0, tCal = 0, tVitA = 0, tVitC = 0, tVitD = 0, tVitB12 = 0;

  todayLog.meals.forEach(m => m.foods.forEach(f => {
    totalCal   += f.calories;
    totalPro   += f.protein;
    totalCarbs += f.carbs;
    totalFats  += f.fats;
    tFib += f.fiber || 0;
    tSug += f.sugar || 0;
    tSod += f.sodium || 0;
    tPot += f.potassium || 0;
    tIron += f.iron || 0;
    tCal += f.calcium || 0;
    tVitA += f.vitaminA || 0;
    tVitC += f.vitaminC || 0;
    tVitD += f.vitaminD || 0;
    tVitB12 += f.vitaminB12 || 0;
  }));

  const filtered = search.length > 1
    ? FOOD_DATABASE.filter(f => {
        if (searchTab === 'raw' && f.category !== 'Raw') return false;
        return f.name.toLowerCase().includes(search.toLowerCase());
      }).slice(0, 10)
    : [];

  const handleAdd = (food: Food, quantity: number) => {
    if (quantity <= 0) return;
    const ratio = quantity / food.servingSize;

    // ── Scaled macros ──────────────────────────────────────────────────────
    const scaledCal     = Math.round(food.calories  * ratio);
    const scaledProtein = parseFloat((food.protein  * ratio).toFixed(1));
    const scaledCarbs   = parseFloat((food.carbs    * ratio).toFixed(1));
    const scaledFats    = parseFloat((food.fats     * ratio).toFixed(1));

    // ── Micronutrients: use food DB value if present, else estimate from macros ──
    // Estimation formulas (per scaled portion):
    //   fiber     ≈ carbs × 2%  + protein × 0.5%
    //   sugar     ≈ carbs × 5%
    //   sodium    ≈ protein × 6 + carbs × 0.5 + calories × 0.08
    //   potassium ≈ protein × 12 + carbs × 1.5 + fats × 0.5
    //   iron      ≈ protein × 0.04 + carbs × 0.008
    //   calcium   ≈ protein × 0.6 + carbs × 0.1 + fats × 0.2
    //   vitaminC  ≈ carbs × 0.15
    //   vitaminA  ≈ fats × 0.8
    //   vitaminD  ≈ fats × 0.05
    const est = {
      fiber:     parseFloat((scaledCarbs * 0.02  + scaledProtein * 0.005).toFixed(1)),
      sugar:     parseFloat((scaledCarbs * 0.05).toFixed(1)),
      sodium:    Math.round(scaledProtein * 6    + scaledCarbs * 0.5  + scaledCal * 0.08),
      potassium: Math.round(scaledProtein * 12   + scaledCarbs * 1.5  + scaledFats * 0.5),
      iron:      parseFloat((scaledProtein * 0.04 + scaledCarbs * 0.008).toFixed(1)),
      calcium:   Math.round(scaledProtein * 0.6  + scaledCarbs * 0.1  + scaledFats * 0.2),
      vitaminC:  Math.round(scaledCarbs * 0.15),
      vitaminA:  Math.round(scaledFats  * 0.8),
      vitaminD:  parseFloat((scaledFats * 0.05).toFixed(1)),
    };

    const logged: LoggedFood = {
      foodId: food.id, name: food.name, nameAr: food.nameAr,
      amount: quantity, unit: food.servingUnit,
      calories: scaledCal,
      protein:  scaledProtein,
      carbs:    scaledCarbs,
      fats:     scaledFats,
      // Use DB value if present, fall back to macro-based estimate
      fiber:     food.fiber     != null ? parseFloat((food.fiber     * ratio).toFixed(1)) : est.fiber,
      sugar:     food.sugar     != null ? parseFloat((food.sugar     * ratio).toFixed(1)) : est.sugar,
      sodium:    food.sodium    != null ? Math.round(food.sodium    * ratio)              : est.sodium,
      potassium: food.potassium != null ? Math.round(food.potassium * ratio)              : est.potassium,
      iron:      food.iron      != null ? parseFloat((food.iron      * ratio).toFixed(1)) : est.iron,
      calcium:   food.calcium   != null ? Math.round(food.calcium   * ratio)              : est.calcium,
      vitaminA:  food.vitaminA  != null ? Math.round(food.vitaminA  * ratio)              : est.vitaminA,
      vitaminC:  food.vitaminC  != null ? Math.round(food.vitaminC  * ratio)              : est.vitaminC,
      vitaminD:  food.vitaminD  != null ? Math.round(food.vitaminD  * ratio)              : est.vitaminD,
      vitaminB12: food.vitaminB12 != null ? parseFloat((food.vitaminB12 * ratio).toFixed(1)) : undefined,
    };
    addFood(todayLog.date, mealType, logged);
    addXP(2);
    if (totalPro + logged.protein >= targets.protein) unlockBadge('hydration_hero');
    setSearch('');
  };


  const toggleMeal = (type: string) =>
    setOpenMeals(o => ({ ...o, [type]: !o[type] }));

  // Raw English keys (must match what's stored in DB)
  const MEAL_TYPE_KEYS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Pre-workout', 'Post-workout'];
  // Translated labels for display
  const MEAL_TYPE_LABELS: Record<string, string> = {
    'Breakfast':    t('nutrition.breakfast', 'Breakfast'),
    'Lunch':        t('nutrition.lunch', 'Lunch'),
    'Dinner':       t('nutrition.dinner', 'Dinner'),
    'Snacks':       t('nutrition.snacks', 'Snacks'),
    'Pre-workout':  t('nutrition.pre_workout', 'Pre-workout'),
    'Post-workout': t('nutrition.post_workout', 'Post-workout'),
  };

  return (
    <div className="page">
      {/* Header */}
      <header style={{ marginBottom: '1.75rem' }}>
        <div className="section-label">{t('nutrition.daily_fuel')}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.06em' }}>
          {t('nutrition.title')} <span className="neon-magenta">{t('nutrition.log')}</span>
        </h1>
      </header>

      {/* Macro Summary */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem',
          textAlign: 'center', gap: '0.5rem',
        }}>
          {[
            { label: t('dash.calories'), val: Math.round(totalCal), unit: t('common.kcal'), color: 'var(--cyan)' },
            { label: t('dash.protein'), val: Math.round(totalPro), unit: 'g', color: 'var(--color-success)' },
            { label: t('nutrition.carbs'), val: Math.round(totalCarbs), unit: 'g', color: 'var(--color-warning)' },
            { label: t('nutrition.fats'), val: Math.round(totalFats), unit: 'g', color: 'var(--magenta)' },
          ].map(({ label, val, unit, color }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '0.65rem', color, opacity: 0.6, fontFamily: 'var(--font-mono)' }}>{unit}</div>
            </div>
          ))}
        </div>
        <MacroBar label={t('dash.calories')} current={totalCal} target={targets.calories} gradient="linear-gradient(90deg,var(--cyan),#0080ff)" unit={` ${t('common.kcal')}`} />
        <MacroBar label={t('dash.protein')} current={totalPro} target={targets.protein} gradient="linear-gradient(90deg,#00ff88,var(--cyan))" />
        <MacroBar label={t('nutrition.carbs')} current={totalCarbs} target={targets.carbs} gradient="linear-gradient(90deg,var(--color-warning),#ff6600)" />
        <MacroBar label={t('nutrition.fats')} current={totalFats} target={targets.fats} gradient="linear-gradient(90deg,var(--magenta),#8800aa)" />
        
        <button onClick={() => setShowMicros(!showMicros)} style={{
          width: '100%', marginTop: '1rem', padding: '0.5rem', fontSize: '0.75rem',
          color: 'var(--cyan)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          {t('nutrition.more_nutrients')} <ChevronDown size={14} style={{ transform: showMicros ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
        {showMicros && (
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem', fontSize: '0.75rem' }}>
            {[
              { label: t('nutrition.fiber'),     val: `${Math.round(tFib)}g` },
              { label: t('nutrition.sugar'),     val: `${Math.round(tSug)}g` },
              { label: t('nutrition.sodium'),    val: `${Math.round(tSod)}mg` },
              { label: t('nutrition.potassium'), val: `${Math.round(tPot)}mg` },
              { label: t('nutrition.iron'),      val: `${tIron.toFixed(1)}mg` },
              { label: t('nutrition.calcium'),   val: `${Math.round(tCal)}mg` },
              { label: t('nutrition.vitaminC'),  val: `${Math.round(tVitC)}mg` },
              { label: t('nutrition.vitaminA'),  val: `${Math.round(tVitA)}mcg` },
              { label: t('nutrition.vitaminD'),  val: `${tVitD.toFixed(1)}mcg` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Water */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="section-label" style={{ margin: 0 }}>{t('nutrition.water')}</div>
          <button 
            onClick={() => window.confirm('Reset water intake to 0?') && resetWater(todayLog.date)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.6)', cursor: 'pointer', display: 'flex' }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <WaterBottle current={todayLog.waterMl} target={targets.water} />
      </div>

      {/* Food Search + Add */}
      <div className="animate-fade-up" style={{ marginBottom: '1.25rem' }}>
        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('nutrition.log_food')}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button onClick={() => setSearchTab('all')} style={{
            flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600,
            background: searchTab === 'all' ? 'rgba(0,240,255,0.1)' : 'transparent',
            color: searchTab === 'all' ? 'var(--cyan)' : 'var(--color-text-muted)',
            border: `1px solid ${searchTab === 'all' ? 'rgba(0,240,255,0.3)' : 'transparent'}`,
            borderRadius: 8, transition: '0.2s'
          }}>{t('nutrition.tab_all')}</button>
          <button onClick={() => setSearchTab('raw')} style={{
            flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600,
            background: searchTab === 'raw' ? 'rgba(0,255,136,0.1)' : 'transparent',
            color: searchTab === 'raw' ? 'var(--color-success)' : 'var(--color-text-muted)',
            border: `1px solid ${searchTab === 'raw' ? 'rgba(0,255,136,0.3)' : 'transparent'}`,
            borderRadius: 8, transition: '0.2s'
          }}>{t('nutrition.tab_raw')}</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ width: '45%' }}>
            {MEAL_TYPE_KEYS.map(key => <option key={key} value={key}>{MEAL_TYPE_LABELS[key]}</option>)}
          </select>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', insetInlineStart: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder={t('nutrition.search')} value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingInlineStart: '2.25rem' }}
            />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="glass-card" style={{ maxHeight: 280, overflowY: 'auto', borderRadius: 'var(--radius-md)' }}>
            {filtered.map(f => <FoodResultRow key={f.id} food={f} onAdd={handleAdd} />)}
          </div>
        )}
      </div>

      {/* Meal Logs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="section-label">{t('nutrition.meals')}</div>
        {MEAL_TYPE_KEYS.map(typeKey => {
          const meal = todayLog.meals.find(m => m.type === typeKey);
          if (!meal || meal.foods.length === 0) return null;
          const isOpen = openMeals[typeKey] !== false;
          const mealCal = meal.foods.reduce((a, f) => a + f.calories, 0);
          const typeLabel = MEAL_TYPE_LABELS[typeKey] || typeKey;
          return (
            <div key={typeKey} className="glass-card" style={{ marginBottom: '0.75rem' }}>
              <button onClick={() => toggleMeal(typeKey)} style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.25rem', color: 'var(--color-text)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{typeLabel}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>{Math.round(mealCal)} kcal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{meal.foods.length} {t('common.items')}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Reset ${typeLabel}?`)) resetMeal(todayLog.date, typeKey);
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.6)', padding: '0 0.25rem', display: 'flex' }}
                  >
                    <RotateCcw size={14} />
                  </button>
                  <ChevronDown size={16} color="var(--color-text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  {meal.foods.map((food, fi) => {
                    const loggedName = useLanguageStore.getState().lang === 'ar' && food.nameAr ? food.nameAr : food.name;
                    return (
                    <div key={fi} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0',
                      borderTop: '1px solid rgba(0,240,255,0.07)',
                    }}>
                      <div style={{ flex: 1, paddingInlineEnd: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.15rem' }}>{loggedName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                          {food.amount}{food.unit} · {food.calories}kcal
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                          P:{Math.round(food.protein)}g · C:{Math.round(food.carbs)}g · F:{Math.round(food.fats)}g
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFood(todayLog.date, meal.id, food.foodId)}
                        style={{ background: 'rgba(255,0,80,0.1)', border: '1px solid rgba(255,0,80,0.25)', borderRadius: 6, padding: '0.35rem', display: 'flex', color: 'rgba(255,0,110,0.8)', flexShrink: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Supplements */}
      <Supplements 
        todayLog={todayLog} 
        onReset={() => window.confirm('Reset today\'s supplements?') && resetSupplements(todayLog.date)}
      />
    </div>
  );
};

export default Nutrition;
