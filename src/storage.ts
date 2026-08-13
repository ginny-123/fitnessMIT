export type SetLog = { weight: number; reps: number; rir: number; done: boolean }
export type ExerciseLog = { exerciseId: string; sets: SetLog[] }
export type WorkoutLog = { id: string; date: string; workoutId: string; completed: boolean; exercises: ExerciseLog[]; duration?: number }
export type DayNutrition = { date: string; completedMeals: string[]; calories: number; protein: number; water: number; selectedMeals?: Record<string,string> }
export type Measurement = { date: string; weight: number; waist?: number; bodyFat?: number }
export type Store = { workouts: WorkoutLog[]; nutrition: DayNutrition[]; measurements: Measurement[]; lastBackup?: string }

const KEY = 'fittrack-personal-v1'
export const emptyStore: Store = {
  workouts: [], nutrition: [], measurements: [{date:'2026-08-11',weight:191,bodyFat:18.7}],
}
export function loadStore(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) || '') as Store } catch { return emptyStore }
}
export function saveStore(store: Store) { localStorage.setItem(KEY, JSON.stringify(store)) }
export function downloadBackup(store: Store) {
  const blob = new Blob([JSON.stringify({...store,lastBackup:new Date().toISOString()},null,2)],{type:'application/json'})
  const url = URL.createObjectURL(blob); const link = document.createElement('a')
  link.href=url; link.download=`fittrack-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url)
}
