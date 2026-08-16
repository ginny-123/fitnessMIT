import { useEffect, useMemo, useRef, useState } from 'react'
import { dayNames, mealLibrary, mealsByDay, workouts, type Exercise, type Workout } from './data'
import { downloadBackup, emptyStore, loadStore, saveStore, type ExerciseLog, type Store, type WorkoutLog } from './storage'
import CoachReview from './CoachReview'
import PlanImporter from './PlanImporter'
import ActivePlanView from './ActivePlanView'
import GeminiCoach from './GeminiCoach'
import WorkoutEditor, { exerciseVideoSearch } from './WorkoutEditor'

type View = 'today'|'workout'|'nutrition'|'progress'|'plan'|'settings'
const icons: Record<View,string> = {today:'⌂',workout:'◆',nutrition:'●',progress:'↗',plan:'▤',settings:'⚙'}
const labels: Record<View,string> = {today:'Today',workout:'Workout',nutrition:'Nutrition',progress:'Progress',plan:'Plan',settings:'Settings'}
const EASTERN_TIME_ZONE = 'America/New_York'
const easternDate = (d=new Date()) => {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:EASTERN_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d)
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||''
  return `${get('year')}-${get('month')}-${get('day')}`
}
const iso = easternDate
const formatDate = (d:string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined,{timeZone:'UTC',month:'short',day:'numeric'})
const shiftDate=(date:string,days:number)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}

function App(){
  const [view,setView]=useState<View>('today')
  const [date,setDate]=useState(iso())
  const [store,setStore]=useState<Store>(loadStore)
  const [toast,setToast]=useState('')
  const [activeWorkout,setActiveWorkout]=useState<Workout|null>(null)
  useEffect(()=>saveStore(store),[store])
  useReminders(store)
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)}},[toast])
  const selectedDate=new Date(`${date}T12:00:00Z`), day=selectedDate.getUTCDay()
  const baseWorkouts=(store.activePlan?.workouts||workouts) as Workout[]
  const activeWorkouts=baseWorkouts.map(w=>store.workoutOverrides?.[w.id]||w) as Workout[]
  const activeMealsByDay=(store.activePlan?.mealsByDay||mealsByDay) as Record<number,typeof mealsByDay[0]>
  for(const meal of Object.values(activeMealsByDay).flat())if(!mealLibrary.some(existing=>existing.name===meal.name))mealLibrary.push(meal)
  const activeMealLibrary=Array.from(new Map([...mealLibrary,...Object.values(activeMealsByDay).flat()].map(meal=>[meal.name,meal])).values())
  const workout=activeWorkouts.find(w=>w.day===day)
  const plannedMeals=activeMealsByDay[day]
  const nutrition=store.nutrition.find(n=>n.date===date)
  const meals=plannedMeals.map(slot=>{
    const chosen=activeMealLibrary.find(m=>m.name===nutrition?.selectedMeals?.[slot.id])
    return chosen?{...chosen,id:slot.id,time:slot.time}:slot
  })
  const completedMeals=nutrition?.completedMeals||[]
  const mealTotals=meals.reduce((a,m)=>({cal:a.cal+m.calories,pro:a.pro+m.protein}),{cal:0,pro:0})
  const consumed=meals.filter(m=>completedMeals.includes(m.id)).reduce((a,m)=>({cal:a.cal+m.calories,pro:a.pro+m.protein}),{cal:0,pro:0})

  const toggleMeal=(id:string)=>setStore(s=>{
    const current=s.nutrition.find(n=>n.date===date)||{date,completedMeals:[],calories:0,protein:0,water:0}
    const ids=current.completedMeals.includes(id)?current.completedMeals.filter(x=>x!==id):[...current.completedMeals,id]
    const total=meals.filter(m=>ids.includes(m.id)).reduce((a,m)=>({c:a.c+m.calories,p:a.p+m.protein}),{c:0,p:0})
    const next={...current,completedMeals:ids,calories:total.c,protein:total.p}
    return {...s,nutrition:[...s.nutrition.filter(n=>n.date!==date),next]}
  })
  const updateWater=(amount:number)=>setStore(s=>{
    const current=s.nutrition.find(n=>n.date===date)||{date,completedMeals:[],calories:0,protein:0,water:0}
    return {...s,nutrition:[...s.nutrition.filter(n=>n.date!==date),{...current,water:Math.max(0,(current.water||0)+amount)}]}
  })
  const chooseMeal=(slotId:string,mealName:string)=>setStore(s=>{
    const current=s.nutrition.find(n=>n.date===date)||{date,completedMeals:[],calories:0,protein:0,water:0}
    const selectedMeals={...(current.selectedMeals||{}),[slotId]:mealName}
    const resolved=plannedMeals.map(slot=>{
      const chosen=activeMealLibrary.find(m=>m.name===selectedMeals[slot.id])
      return chosen?{...chosen,id:slot.id,time:slot.time}:slot
    })
    const total=resolved.filter(m=>current.completedMeals.includes(m.id)).reduce((a,m)=>({c:a.c+m.calories,p:a.p+m.protein}),{c:0,p:0})
    return {...s,nutrition:[...s.nutrition.filter(n=>n.date!==date),{...current,selectedMeals,calories:total.c,protein:total.p}]}
  })
  const openWorkout=()=>{if(workout){setActiveWorkout(workout);setView('workout')}}
  const nav=(v:View)=>{setView(v);if(v!=='workout')setActiveWorkout(null)}
  const changeDate=(next:string)=>{setDate(next);setActiveWorkout(null)}
  const displayedWorkout=activeWorkout||workout
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">FT</span><span><b>FitTrack</b><small>Personal performance</small></span></div>
      <nav>{(['today','workout','nutrition','progress','plan','settings'] as View[]).map(v=><button key={v} className={view===v?'active':''} onClick={()=>nav(v)}><span>{icons[v]}</span>{labels[v]}</button>)}</nav>
      <div className="privacy"><b>Private by design</b><small>Your records stay on this device.</small></div>
    </aside>
    <main>
      <header><div className="header-title"><span className="eyebrow">4-WEEK BUILD · U.S. EASTERN TIME</span><h1>{labels[view]}</h1></div><div className="header-actions"><div className="date-navigation"><button aria-label="Previous day" title="Previous day" onClick={()=>changeDate(shiftDate(date,-1))}>‹</button><label className="date-picker"><span>Workout date · EST/EDT</span><input aria-label="Select workout date" type="date" value={date} onChange={e=>changeDate(e.target.value)}/></label><button aria-label="Next day" title="Next day" onClick={()=>changeDate(shiftDate(date,1))}>›</button><button className="today-button" onClick={()=>changeDate(easternDate())} disabled={date===easternDate()}>Today</button></div><span className="avatar">M</span></div></header>
      {view==='today'&&<Today date={date} day={day} workout={workout} meals={meals} consumed={consumed} mealTotals={mealTotals} water={nutrition?.water||0} onWorkout={openWorkout} onMeal={toggleMeal} completedMeals={completedMeals} onWater={updateWater}/>} 
      {view==='workout'&&(displayedWorkout?<WorkoutView key={`${date}-${displayedWorkout.id}`} date={date} workout={displayedWorkout} store={store} setStore={setStore} onDone={()=>{setToast('Workout saved');setView('today');setActiveWorkout(null)}}/>:<NoWorkout date={date} onPrevious={()=>changeDate(shiftDate(date,-1))}/>)}
      {view==='nutrition'&&<Nutrition date={date} meals={meals} completed={completedMeals} onMeal={toggleMeal} onChooseMeal={chooseMeal} consumed={consumed} total={mealTotals} water={nutrition?.water||0} onWater={updateWater}/>} 
      {view==='progress'&&<><Progress store={store}/><div className="page coach-page"><GeminiCoach store={store} activeWorkouts={activeWorkouts}/><CoachReview store={store} activeWorkouts={activeWorkouts}/></div></>} 
      {view==='plan'&&<><div className="page instructions-page"><UniversalInstructions/></div>{store.activePlan?<ActivePlanView plan={store.activePlan} workouts={activeWorkouts}/>:<Plan/>}<div className="page workout-editor-page"><WorkoutEditor store={store} setStore={setStore} baseWorkouts={baseWorkouts} workouts={activeWorkouts} toast={setToast}/></div><div className="page importer-page"><PlanImporter store={store} setStore={setStore} currentWorkouts={activeWorkouts} toast={setToast}/></div></>} 
      {view==='settings'&&<><div className="page reminder-page"><ReminderPanel store={store} setStore={setStore} toast={setToast}/></div><Settings store={store} setStore={setStore} toast={setToast}/></>} 
    </main>
    <div className="bottom-nav">{(['today','workout','nutrition','progress','plan','settings'] as View[]).map(v=><button key={v} className={view===v?'active':''} onClick={()=>nav(v)}><span>{icons[v]}</span><small>{labels[v]}</small></button>)}</div>
    {toast&&<div className="toast">✓ {toast}</div>}
  </div>
}

function Today({date,day,workout,meals,consumed,mealTotals,water,onWorkout,onMeal,completedMeals,onWater}:{date:string;day:number;workout?:Workout;meals:typeof mealsByDay[0];consumed:{cal:number;pro:number};mealTotals:{cal:number;pro:number};water:number;onWorkout:()=>void;onMeal:(id:string)=>void;completedMeals:string[];onWater:(n:number)=>void}){
  const training=!!workout
  return <div className="page">
    <section className={`hero ${training?'training':'recovery'}`}>
      <div><span className="pill">{dayNames[day]} · {formatDate(date)}</span><h2>{training?workout.title:'Recover, refuel, repeat.'}</h2><p>{training?workout.focus:'Easy movement, mobility, protein and consistent hydration.'}</p>{training?<button className="primary" onClick={onWorkout}>Start workout <span>→</span></button>:<button className="primary ghost">Recovery day</button>}</div>
      <div className="hero-ring"><b>{training?'~60':'20–30'}</b><small>{training?'minutes':'min walk'}</small></div>
    </section>
    <section className="metrics">
      <Metric label="Protein" value={`${consumed.pro}g`} sub={`of ${mealTotals.pro}g planned`} pct={consumed.pro/mealTotals.pro}/>
      <Metric label="Energy" value={consumed.cal.toLocaleString()} sub={`of ${mealTotals.cal.toLocaleString()} kcal`} pct={consumed.cal/mealTotals.cal}/>
      <div className="metric water-metric"><span>Water</span><b>{water} ml</b><small>Daily guide: approximately 3,000 ml</small><i><em style={{width:`${Math.min(100,water/3000*100)}%`}}/></i><div className="inline-stepper"><button onClick={()=>onWater(-250)} disabled={water===0}>− 250</button><button onClick={()=>onWater(250)}>+ 250</button></div></div>
    </section>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">TODAY'S FUEL</span><h3>Meal timeline</h3></div><span className="mini-status">{completedMeals.length}/{meals.length} complete</span></div>
        <div className="meal-list">{meals.map(m=><button className={`meal-row ${completedMeals.includes(m.id)?'done':''}`} key={m.id} onClick={()=>onMeal(m.id)}><span className="check">{completedMeals.includes(m.id)?'✓':''}</span><time>{m.time}</time><span className="meal-copy"><b>{m.name}</b><small>{m.detail}</small></span><span className="macro">{m.protein}g<small>protein</small></span></button>)}</div>
      </section>
      <section className="panel recommendation"><span className="eyebrow">COACHING NOTE</span><h3>{training?'Earn the increase':'Recovery drives the next session'}</h3><p>{training?'Keep two clean reps in reserve. Increase only after every set reaches the top of its range with controlled form.':'A short walk and normal protein intake are enough. You do not need to “make up” missed training today.'}</p><div className="rule"><b>{training?'Progression rule':'Today’s focus'}</b><span>{training?'Top reps × all sets × RIR 1–2 → add one machine increment':'20–30 min easy movement · normal protein · sleep 7–9 hours'}</span></div></section>
    </div>
  </div>
}

function Metric({label,value,sub,pct,onClick}:{label:string;value:string;sub:string;pct:number;onClick?:()=>void}){return <button className="metric" onClick={onClick}><span>{label}</span><b>{value}</b><small>{sub}</small><i><em style={{width:`${Math.min(100,pct*100)}%`}}/></i></button>}

function UniversalInstructions(){return <details className="universal-instructions" open><summary><span><b>Universal workout instructions</b><small>Warm-up · tempo · RIR · rest · logging</small></span><strong>Review</strong></summary><div className="instruction-grid"><div><span>01</span><p>Warm up with <b>five minutes of easy cardio</b>.</p></div><div><span>02</span><p>For the first major exercise, complete <b>2–3 progressively heavier warm-up sets</b>.</p></div><div><span>03</span><p>Warm-up sets <b>do not count</b> as working sets.</p></div><div><span>04</span><p>Use controlled repetitions: approximately <b>2 seconds lowering</b> and <b>1–2 seconds lifting</b>.</p></div><div><span>05</span><p>Use the full comfortable range of motion.</p></div><div><span>06</span><p>Finish most sets with <b>2 reps in reserve (RIR 2)</b>.</p></div><div><span>07</span><p>Rest <b>2–3 minutes</b> after compound exercises.</p></div><div><span>08</span><p>Rest <b>60–90 seconds</b> after isolation exercises.</p></div><div><span>09</span><p>Do not increase weight merely because one set felt easy.</p></div><div><span>10</span><p>Record every working set separately.</p></div></div></details>}

function NoWorkout({date,onPrevious}:{date:string;onPrevious:()=>void}){return <div className="page"><section className="panel no-workout"><span className="eyebrow">{formatDate(date)} · REST DAY</span><h2>No workout is scheduled for this date.</h2><p className="muted">Use the date control above to open any previous training day and enter or edit its working sets.</p><button className="primary" onClick={onPrevious}>Go to previous day</button></section></div>}

function recommendation(ex:Exercise, history:WorkoutLog[]){
  const past=history.flatMap(w=>w.exercises).filter(e=>e.exerciseId===ex.id)
  const latest=past.at(-1), prior=past.at(-2)
  if(!latest){return {weight:ex.startingWeight||0,text:ex.startingWeight?`Start from your recent baseline and finish with 2–3 reps in reserve.`:'Use a light discovery load and establish a clean baseline.'}}
  const success=(log:ExerciseLog)=>log.sets.length>=ex.sets&&log.sets.every(s=>s.done&&s.reps>=ex.maxReps&&s.rir>=1)
  const lastWeight=latest.sets[0]?.weight||ex.startingWeight||0
  if(prior&&success(latest)&&success(prior)) return {weight:lastWeight+ex.increment,text:`Increase one increment: top reps were completed in two sessions with reps in reserve.`}
  const failed=latest.sets.filter(s=>s.done&&s.reps<ex.minReps).length
  if(failed>=2&&prior&&prior.sets.filter(s=>s.done&&s.reps<ex.minReps).length>=2) return {weight:Math.max(0,lastWeight-ex.increment),text:'Reduce one increment: minimum reps were missed in two sessions.'}
  return {weight:lastWeight,text:'Keep the same load and build clean repetitions before increasing.'}
}

function WorkoutView({date,workout,store,setStore,onDone}:{date:string;workout:Workout;store:Store;setStore:(s:Store)=>void;onDone:()=>void}){
  const existing=store.workouts.find(w=>w.date===date&&w.workoutId===workout.id)
  const makeLogs=()=>workout.exercises.map(ex=>({exerciseId:ex.id,sets:Array.from({length:ex.sets},()=>({weight:recommendation(ex,store.workouts).weight,reps:ex.minReps,rir:2,done:false}))}))
  const [logs,setLogs]=useState<ExerciseLog[]>(existing?.exercises||makeLogs)
  const [started]=useState(Date.now()), [rest,setRest]=useState(0)
  useEffect(()=>{if(rest<=0)return;const t=setInterval(()=>setRest(r=>r-1),1000);return()=>clearInterval(t)},[rest])
  const update=(ei:number,si:number,key:'weight'|'reps'|'rir',value:number)=>setLogs(ls=>ls.map((e,i)=>i!==ei?e:{...e,sets:e.sets.map((s,j)=>j!==si?s:{...s,[key]:value})}))
  const toggle=(ei:number,si:number,seconds:number)=>{setLogs(ls=>ls.map((e,i)=>i!==ei?e:{...e,sets:e.sets.map((s,j)=>j!==si?s:{...s,done:!s.done})}));setRest(seconds)}
  const completed=logs.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0), total=logs.reduce((a,e)=>a+e.sets.length,0)
  const finish=()=>{const entry:WorkoutLog={id:`${date}-${workout.id}`,date,workoutId:workout.id,completed:completed===total,exercises:logs,duration:Math.round((Date.now()-started)/60000)};setStore({...store,workouts:[...store.workouts.filter(w=>w.id!==entry.id),entry]});onDone()}
  return <div className="page workout-page">{date!==easternDate()&&<p className="past-session-note">Editing workout for <b>{dayNames[workout.day]}, {formatDate(date)}</b>. Saving will update that day's existing session without creating a duplicate.</p>}<section className="workout-banner"><div><span className="eyebrow">{dayNames[workout.day]} · {existing?'EDIT SESSION':'WORKOUT SESSION'}</span><h2>{workout.title}</h2><p>{workout.focus}</p></div><div className="session-progress"><b>{completed}/{total}</b><small>sets complete</small></div></section>
    <UniversalInstructions/>
    {rest>0&&<div className="rest-timer"><span>Rest timer</span><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>Skip</button></div>}
    <div className="exercise-stack">{workout.exercises.map((ex,ei)=>{const rec=recommendation(ex,store.workouts);return <section className="exercise-card" key={ex.id}><div className="exercise-head"><span className="sequence">{ei+1}</span><div><h3>{ex.name}</h3><p>{ex.sets} × {ex.minReps}–{ex.maxReps} · {ex.rest}s rest · {ex.cue}</p></div><div className="suggested"><small>Suggested</small><b>{rec.weight||'Find'}{rec.weight?' kg':''}</b></div></div><div className="rec-reason">↗ {rec.text}</div><div className="sets-table"><div className="set-row labels"><span>Set</span><span>Weight</span><span>Reps</span><span>RIR</span><span>Done</span></div>{logs[ei].sets.map((s,si)=><div className={`set-row ${s.done?'done':''}`} key={si}><b>{si+1}</b><input aria-label={`${ex.name} set ${si+1} weight`} type="number" value={s.weight} step="0.5" onChange={e=>update(ei,si,'weight',+e.target.value)}/><input aria-label={`${ex.name} set ${si+1} reps`} type="number" value={s.reps} onChange={e=>update(ei,si,'reps',+e.target.value)}/><select aria-label={`${ex.name} set ${si+1} reps in reserve`} value={s.rir} onChange={e=>update(ei,si,'rir',+e.target.value)}><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option></select><button aria-label={`Complete ${ex.name} set ${si+1}`} onClick={()=>toggle(ei,si,ex.rest)}>{s.done?'✓':''}</button></div>)}</div></section>})}</div>
    <button className="finish" onClick={finish}>Save workout · {completed}/{total} sets</button>
  </div>
}

function Nutrition({date,meals,completed,onMeal,onChooseMeal,consumed,total,water,onWater}:{date:string;meals:typeof mealsByDay[0];completed:string[];onMeal:(id:string)=>void;onChooseMeal:(slotId:string,mealName:string)=>void;consumed:{cal:number;pro:number};total:{cal:number;pro:number};water:number;onWater:(n:number)=>void}){return <div className="page"><section className="nutrition-hero"><div><span className="eyebrow">{formatDate(date)} · DAILY FUEL</span><h2>Eat to perform. Track what happened.</h2><p>Choose any predefined meal for each time slot, then mark it complete.</p></div><div className="macro-rings"><div><b>{consumed.cal}</b><small>kcal logged</small></div><div><b>{consumed.pro}g</b><small>protein</small></div></div></section><div className="two-col nutrition-grid"><section className="panel"><div className="panel-head"><div><span className="eyebrow">MEAL PLAN</span><h3>{consumed.cal.toLocaleString()} / {total.cal.toLocaleString()} kcal</h3></div></div><div className="meal-editor-list">{meals.map(m=><div className={`meal-editor ${completed.includes(m.id)?'done':''}`} key={m.id}><button className="check" aria-label={`Mark ${m.name} complete`} onClick={()=>onMeal(m.id)}>{completed.includes(m.id)?'✓':''}</button><time>{m.time}</time><div className="meal-choice"><select aria-label={`Choose meal for ${m.time}`} value={m.name} onChange={e=>onChooseMeal(m.id,e.target.value)}>{mealLibrary.map(option=><option key={option.name} value={option.name}>{option.name}</option>)}</select><small>{m.detail}</small></div><span className="macro">{m.calories}<small>kcal · {m.protein}g P</small></span></div>)}</div></section><section className="side-stack"><section className="panel water"><span className="eyebrow">HYDRATION</span><div className="water-total"><b>{water}</b><span>ml</span></div><div className="water-actions"><button onClick={()=>onWater(-250)} disabled={water===0}>− 250</button><button onClick={()=>onWater(250)}>+ 250 ml</button></div></section><section className="panel"><span className="eyebrow">FOOD RULES</span><h3>Simple boundaries</h3><ul className="clean-list"><li>Chicken and eggs are the only animal proteins beyond dairy.</li><li>No soy, tofu, tempeh, edamame or soy protein.</li><li>Measure oil, ghee, nuts and paneer portions.</li><li>Keep protein steady on rest days.</li></ul></section></section></div></div>}

function Progress({store}:{store:Store}){
  const last28=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);return iso(d)})
  const sessions=store.workouts.filter(w=>last28.includes(w.date)&&w.completed)
  const sets=sessions.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.filter(s=>s.done).length,0),0)
  const nutritionDays=store.nutrition.filter(n=>last28.includes(n.date)&&n.protein>=140).length
  const measurements=[...store.measurements].sort((a,b)=>a.date.localeCompare(b.date))
  const weightDelta=measurements.length>1?measurements.at(-1)!.weight-measurements[0].weight:0
  const maxVol=Math.max(1,...sessions.map(w=>w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.done?s.weight*s.reps:0),0),0)))
  return <div className="page"><section className="progress-head"><div><span className="eyebrow">LAST 28 DAYS</span><h2>Progress is a pattern, not a single reading.</h2></div></section><section className="metrics"><Metric label="Workouts" value={String(sessions.length)} sub="completed sessions" pct={sessions.length/16}/><Metric label="Working sets" value={String(sets)} sub="quality sets logged" pct={sets/160}/><Metric label="Protein days" value={String(nutritionDays)} sub="days at 140g+" pct={nutritionDays/28}/></section><div className="two-col"><section className="panel"><div className="panel-head"><div><span className="eyebrow">TRAINING LOAD</span><h3>Session volume</h3></div><span className="mini-status">weight × reps</span></div><div className="bars">{sessions.length?sessions.slice(-10).map(w=>{const vol=w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.done?s.weight*s.reps:0),0),0);return <div key={w.id}><i style={{height:`${Math.max(8,vol/maxVol*100)}%`}}/><small>{formatDate(w.date)}</small></div>}):<Empty text="Complete a workout to begin your volume chart."/>}</div></section><section className="panel"><span className="eyebrow">BODY TREND</span><h3>{measurements.at(-1)?.weight||'—'} lb <small className={weightDelta>0?'up':''}>{weightDelta?`${weightDelta>0?'+':''}${weightDelta.toFixed(1)} lb`:'baseline'}</small></h3><div className="body-card"><div><span>Latest body-fat estimate</span><b>{measurements.at(-1)?.bodyFat||'—'}%</b></div><div><span>Measurements</span><b>{measurements.length}</b></div></div><p className="muted">Use morning weight averages and waist trend. Smart-scale composition values are estimates.</p></section></div></div>
}
function Empty({text}:{text:string}){return <div className="empty">↗<span>{text}</span></div>}

function Plan(){const [open,setOpen]=useState(workouts[0].id);return <div className="page"><section className="plan-hero"><div><span className="eyebrow">ACTIVE BLOCK · 4 WEEKS</span><h2>Build width, strength and consistency.</h2><p>Four machine-first sessions with added back, rear-delt, unilateral and core work.</p></div><div className="plan-tags"><span>4 days/week</span><span>RIR 2</span><span>55–70 min</span></div></section><section className="phase-strip"><div><b>Week 1</b><span>Establish</span></div><div><b>Week 2</b><span>Build reps</span></div><div><b>Week 3</b><span>Progress</span></div><div><b>Week 4</b><span>Consolidate</span></div></section><div className="plan-list">{workouts.map(w=><section className={`plan-day ${w.tone}`} key={w.id}><button className="plan-day-head" onClick={()=>setOpen(open===w.id?'':w.id)}><span><small>{dayNames[w.day]}</small><b>{w.title}</b><em>{w.focus}</em></span><strong>{w.exercises.length} exercises {open===w.id?'−':'+'}</strong></button>{open===w.id&&<div className="plan-exercises">{w.exercises.map((e,i)=><div key={e.id}><span>{i+1}</span><b>{e.name}</b><small>{e.sets} × {e.minReps}–{e.maxReps}</small><em>{e.cue}</em></div>)}</div>}</section>)}</div><section className="panel plan-rule"><span className="eyebrow">DOUBLE-PROGRESSION RULE</span><h3>Reps first. Load second.</h3><p>Increase one machine increment only after every prescribed set reaches the top of its range in two sessions with at least one clean rep remaining. Otherwise retain the load and build repetitions.</p></section></div>}

function easternNow(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date())
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||''
  return {date:`${get('year')}-${get('month')}-${get('day')}`,day:get('weekday'),hour:+get('hour'),minute:+get('minute')}
}
function parseTime(value:string){const match=value.match(/(\d+):(\d+)\s*(AM|PM)?/i);if(!match)return null;let hour=+match[1];const minute=+match[2];if(match[3]){if(match[3].toUpperCase()==='PM'&&hour<12)hour+=12;if(match[3].toUpperCase()==='AM'&&hour===12)hour=0}return {hour,minute}}
function useReminders(store:Store){
  useEffect(()=>{
    const settings=store.reminders
    if(!settings?.enabled||!('Notification' in window)||Notification.permission!=='granted')return
    const notify=async(title:string,body:string,key:string)=>{if(localStorage.getItem(`fittrack-reminder-${key}`))return;localStorage.setItem(`fittrack-reminder-${key}`,'sent');const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification(title,{body,icon:'/icon-192.png',badge:'/icon-192.png',tag:key});else new Notification(title,{body,icon:'/icon-192.png',tag:key})}
    const check=()=>{const now=easternNow(),weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(now.day);if(settings.gym&&['Mon','Tue','Thu','Fri'].includes(now.day)){const gym=parseTime(settings.gymTime);if(gym&&now.hour===gym.hour&&now.minute===gym.minute)void notify('Gym time','Your workout is ready. Open FitTrack to begin.',`${now.date}-gym`)}if(settings.meals&&weekday>=0)for(const meal of mealsByDay[weekday]){const time=parseTime(meal.time);if(time&&now.hour===time.hour&&now.minute===time.minute)void notify('Meal reminder',`${meal.name} is planned now.`,`${now.date}-meal-${meal.id}`)}if(settings.water&&now.hour>=8&&now.hour<22){const minutes=now.hour*60+now.minute-480;if(minutes>=0&&minutes%settings.waterIntervalMinutes===0)void notify('Water reminder','Take a hydration break and log it in FitTrack.',`${now.date}-water-${minutes}`)}}
    check();const timer=window.setInterval(check,30000);return()=>window.clearInterval(timer)
  },[store.reminders])
}
function ReminderPanel({store,setStore,toast}:{store:Store;setStore:(s:Store)=>void;toast:(s:string)=>void}){
  const reminders=store.reminders||{enabled:false,water:true,meals:true,gym:true,gymTime:'19:00',waterIntervalMinutes:90}
  const update=(patch:Partial<typeof reminders>)=>setStore({...store,reminders:{...reminders,...patch}})
  const enable=async()=>{if(!('Notification' in window)){toast('Notifications are not supported in this browser');return}const permission=await Notification.requestPermission();update({enabled:permission==='granted'});toast(permission==='granted'?'Reminders enabled':'Notification permission was not granted')}
  return <section className="panel reminder-panel"><span className="eyebrow">REMINDERS · EASTERN TIME</span><h3>Stay on schedule</h3><p className="muted">Gym reminders are set for 7:00 PM on Monday, Tuesday, Thursday and Friday. Install the app and allow notifications for best reliability.</p><div className="reminder-status"><span className={reminders.enabled?'status-dot on':'status-dot'}/><b>{reminders.enabled?'Notifications enabled':'Notifications need permission'}</b></div><button className="primary" onClick={enable}>{reminders.enabled?'Refresh permission':'Enable notifications'}</button><div className="reminder-options"><label><span><b>Water</b><small>Every {reminders.waterIntervalMinutes} minutes · 8 AM–10 PM</small></span><input type="checkbox" checked={reminders.water} onChange={e=>update({water:e.target.checked})}/></label><label><span><b>Meals</b><small>At each meal’s scheduled time</small></span><input type="checkbox" checked={reminders.meals} onChange={e=>update({meals:e.target.checked})}/></label><label><span><b>Gym</b><small>Training days · 7:00 PM Eastern</small></span><input type="checkbox" checked={reminders.gym} onChange={e=>update({gym:e.target.checked})}/></label></div></section>
}

function Settings({store,setStore,toast}:{store:Store;setStore:(s:Store)=>void;toast:(s:string)=>void}){
  const file=useRef<HTMLInputElement>(null);const [weight,setWeight]=useState('');const [waist,setWaist]=useState('');const [fat,setFat]=useState('')
  const add=()=>{if(!weight)return;setStore({...store,measurements:[...store.measurements,{date:iso(),weight:+weight,waist:waist?+waist:undefined,bodyFat:fat?+fat:undefined}]});setWeight('');setWaist('');setFat('');toast('Measurement added')}
  const importFile=(f?:File)=>{if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const next=JSON.parse(String(reader.result));if(!Array.isArray(next.workouts)||!Array.isArray(next.nutrition)||!Array.isArray(next.measurements))throw Error();setStore(next);toast('Backup restored')}catch{toast('That backup file is not valid')}};reader.readAsText(f)}
  return <div className="page"><div className="settings-grid"><section className="panel"><span className="eyebrow">BODY MEASUREMENT</span><h3>Add a morning check-in</h3><div className="form-grid"><label><span>Weight (lb)</span><input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="191.0"/></label><label><span>Waist (in)</span><input type="number" value={waist} onChange={e=>setWaist(e.target.value)} placeholder="Optional"/></label><label><span>Scale body fat %</span><input type="number" value={fat} onChange={e=>setFat(e.target.value)} placeholder="Estimate"/></label></div><button className="primary" onClick={add}>Save measurement</button></section><section className="panel"><span className="eyebrow">BACKUP & RESTORE</span><h3>Your data belongs to you.</h3><p className="muted">Download a backup regularly. Browser data can be lost if storage is cleared or the device is replaced.</p><div className="button-row"><button className="secondary" onClick={()=>{downloadBackup(store);toast('Backup downloaded')}}>Download JSON</button><button className="secondary" onClick={()=>file.current?.click()}>Restore backup</button><input ref={file} hidden type="file" accept="application/json" onChange={e=>importFile(e.target.files?.[0])}/></div></section><section className="panel"><span className="eyebrow">PRIVACY</span><h3>No login. No tracking.</h3><ul className="clean-list"><li>Records remain in this browser.</li><li>No personal data is committed to GitHub.</li><li>No advertising or analytics scripts.</li><li>Plan data contains no executable code.</li></ul></section><section className="panel danger"><span className="eyebrow">RESET</span><h3>Start over on this device</h3><p className="muted">This permanently clears locally saved workouts, meals and measurements.</p><button className="secondary" onClick={()=>{if(confirm('Clear all FitTrack data on this device?')){setStore(emptyStore);toast('Local data cleared')}}}>Clear local data</button></section></div></div>
}
export default App
