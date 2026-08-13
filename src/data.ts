export type Exercise = {
  id: string; name: string; sets: number; minReps: number; maxReps: number;
  rest: number; cue: string; increment: number; startingWeight?: number;
}
export type Workout = { id: string; day: number; title: string; focus: string; tone: 'green'|'blue'; exercises: Exercise[] }
export type Meal = { id: string; time: string; name: string; detail: string; calories: number; protein: number }

export const workouts: Workout[] = [
  { id:'lower-a', day:1, title:'Lower Body A', focus:'Quads · hamstrings · calves', tone:'green', exercises:[
    {id:'leg-press',name:'Seated leg press',sets:4,minReps:8,maxReps:10,rest:150,cue:'Normal stance · controlled depth',increment:5,startingWeight:54},
    {id:'hack-squat',name:'Smith-machine hack squat',sets:3,minReps:8,maxReps:10,rest:150,cue:'Knees track over toes',increment:2.5,startingWeight:10},
    {id:'leg-extension',name:'Seated leg extension',sets:3,minReps:10,maxReps:15,rest:75,cue:'Pause briefly at the top',increment:4.5,startingWeight:32},
    {id:'leg-curl-a',name:'Seated or lying leg curl',sets:3,minReps:10,maxReps:12,rest:90,cue:'Control the lowering phase',increment:4.5,startingWeight:27},
    {id:'calf-press',name:'Seated calf press',sets:4,minReps:12,maxReps:15,rest:75,cue:'Full stretch · no bouncing',increment:5,startingWeight:60},
    {id:'pallof',name:'Pallof press',sets:3,minReps:10,maxReps:12,rest:60,cue:'Each side · resist rotation',increment:2.5},
  ]},
  { id:'upper-a', day:2, title:'Upper Body A', focus:'Chest · back · shoulders · arms', tone:'blue', exercises:[
    {id:'chest-press',name:'Seated machine chest press',sets:3,minReps:8,maxReps:10,rest:150,cue:'Shoulder blades stable',increment:5,startingWeight:30},
    {id:'pulldown-a',name:'Neutral-grip lat pulldown',sets:4,minReps:8,maxReps:12,rest:120,cue:'Drive elbows toward hips',increment:5},
    {id:'row-a',name:'Chest-supported machine row',sets:3,minReps:8,maxReps:12,rest:120,cue:'Pause with elbows behind torso',increment:5},
    {id:'lateral',name:'Cable lateral raise',sets:3,minReps:12,maxReps:15,rest:75,cue:'Lead with elbow · no swinging',increment:2.5,startingWeight:10},
    {id:'pushdown',name:'Rope triceps pushdown',sets:3,minReps:10,maxReps:12,rest:75,cue:'Elbows remain pinned',increment:5,startingWeight:25},
    {id:'curl-a',name:'Cable biceps curl',sets:3,minReps:10,maxReps:12,rest:75,cue:'No shoulder movement',increment:5},
  ]},
  { id:'lower-b', day:4, title:'Lower Body B', focus:'Hamstrings · glutes · calves', tone:'green', exercises:[
    {id:'rdl',name:'Smith-machine Romanian deadlift',sets:3,minReps:8,maxReps:10,rest:150,cue:'Hips back · stable spine',increment:5,startingWeight:10},
    {id:'leg-press-wide',name:'Leg press · high & wide',sets:3,minReps:10,maxReps:12,rest:150,cue:'Even foot pressure',increment:5,startingWeight:54},
    {id:'leg-curl-b',name:'Seated or lying leg curl',sets:3,minReps:10,maxReps:12,rest:90,cue:'Control every rep',increment:4.5,startingWeight:27},
    {id:'split-squat',name:'Supported split squat',sets:2,minReps:8,maxReps:10,rest:120,cue:'Each leg · use support',increment:2.5},
    {id:'calf-raise',name:'Seated calf raise',sets:4,minReps:12,maxReps:15,rest:75,cue:'Full stretch at bottom',increment:5,startingWeight:50},
    {id:'dead-bug',name:'Dead bug',sets:3,minReps:8,maxReps:10,rest:60,cue:'Each side · lower back stable',increment:1},
  ]},
  { id:'upper-b', day:5, title:'Upper Body B', focus:'Upper chest · back · rear delts · arms', tone:'blue', exercises:[
    {id:'incline',name:'Incline chest-press machine',sets:3,minReps:8,maxReps:10,rest:150,cue:'Press up and slightly inward',increment:5,startingWeight:20},
    {id:'row-b',name:'Seated cable or supported row',sets:4,minReps:8,maxReps:12,rest:120,cue:'Chest tall · pull to lower ribs',increment:5},
    {id:'pulldown-b',name:'Neutral-grip lat pulldown',sets:3,minReps:10,maxReps:12,rest:120,cue:'No torso swinging',increment:5},
    {id:'reverse-pec',name:'Reverse pec deck',sets:3,minReps:12,maxReps:15,rest:75,cue:'Move through rear shoulders',increment:5},
    {id:'overhead-tri',name:'Overhead cable triceps extension',sets:3,minReps:10,maxReps:12,rest:75,cue:'Keep elbows steady',increment:5},
    {id:'hammer',name:'Rope hammer curl',sets:3,minReps:10,maxReps:12,rest:75,cue:'Neutral wrist · controlled return',increment:5,startingWeight:20},
  ]},
]

const smoothie: Meal = {id:'smoothie',time:'8:00 AM',name:'Protein smoothie',detail:'Milk · Greek yogurt · whey · banana · berries · spinach · chia',calories:550,protein:45}
export const mealsByDay: Record<number, Meal[]> = {
  1:[smoothie,{id:'m-lunch',time:'1:00 PM',name:'Chicken curry bowl',detail:'180g cooked chicken · rice · palak · salad',calories:760,protein:50},{id:'m-snack',time:'4:30 PM',name:'Pre-workout yogurt & banana',detail:'200g Greek yogurt · banana',calories:280,protein:20},{id:'m-dinner',time:'8:00 PM',name:'Paneer bhurji plate',detail:'Lower-fat paneer · 2 chapatis · dal · vegetables',calories:860,protein:42}],
  2:[smoothie,{id:'t-lunch',time:'1:00 PM',name:'Chicken tikka rice bowl',detail:'180g chicken · rice · cucumber · tomato · raita',calories:780,protein:52},{id:'t-snack',time:'4:30 PM',name:'Eggs & fruit',detail:'2 boiled eggs · seasonal fruit',calories:260,protein:14},{id:'t-dinner',time:'8:00 PM',name:'Rajma paneer plate',detail:'Rajma · paneer · 2 chapatis · vegetables',calories:880,protein:42}],
  3:[{...smoothie,id:'w-breakfast'},{id:'w-lunch',time:'1:00 PM',name:'Chana dal & paneer',detail:'Dal · paneer · 2 chapatis · salad',calories:700,protein:40},{id:'w-snack',time:'5:00 PM',name:'Yogurt, berries & nuts',detail:'Greek yogurt · berries · measured nuts',calories:300,protein:23},{id:'w-dinner',time:'8:00 PM',name:'Chicken palak',detail:'180g chicken · moderate rice · vegetables',calories:790,protein:52}],
  4:[smoothie,{id:'th-lunch',time:'1:00 PM',name:'Chicken keema plate',detail:'Lean minced chicken · rice or chapati · vegetables · yogurt',calories:780,protein:50},{id:'th-snack',time:'4:30 PM',name:'Banana & yogurt',detail:'Banana · Greek yogurt',calories:280,protein:20},{id:'th-dinner',time:'8:00 PM',name:'Paneer moong chilla',detail:'Moong chilla · paneer · chutney · salad',calories:850,protein:44}],
  5:[smoothie,{id:'f-lunch',time:'1:00 PM',name:'Tandoori chicken plate',detail:'180g chicken · rice · dal · salad · yogurt',calories:800,protein:55},{id:'f-snack',time:'4:30 PM',name:'Eggs & fruit',detail:'2 eggs · fruit',calories:260,protein:14},{id:'f-dinner',time:'8:00 PM',name:'Palak paneer & dal',detail:'Paneer · 2 chapatis · dal',calories:860,protein:42}],
  6:[{...smoothie,id:'sa-breakfast'},{id:'sa-lunch',time:'1:00 PM',name:'Measured chicken biryani',detail:'180g chicken · measured oil · raita · salad',calories:800,protein:50},{id:'sa-snack',time:'5:00 PM',name:'Greek yogurt',detail:'Greek yogurt · fruit',calories:260,protein:22},{id:'sa-dinner',time:'8:00 PM',name:'Chole & paneer tikka',detail:'Chole · paneer · vegetables · small rice portion',calories:760,protein:40}],
  0:[{...smoothie,id:'su-breakfast'},{id:'su-lunch',time:'1:00 PM',name:'Chicken vegetable curry',detail:'180g chicken · rice · salad · yogurt',calories:780,protein:52},{id:'su-snack',time:'5:00 PM',name:'Yogurt, fruit & nuts',detail:'Greek yogurt · fruit · measured nuts',calories:300,protein:23},{id:'su-dinner',time:'8:00 PM',name:'Dal paneer plate',detail:'Dal · paneer · 2 chapatis · vegetables',calories:760,protein:40}],
}

export const mealLibrary = Array.from(
  new Map(Object.values(mealsByDay).flat().map(meal => [meal.name, meal])).values(),
)

export const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
