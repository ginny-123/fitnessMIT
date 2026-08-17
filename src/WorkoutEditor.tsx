import { useEffect, useState } from 'react'
import { dayNames, type Workout } from './data'
import type { Store } from './storage'

const clone=(workout:Workout):Workout=>JSON.parse(JSON.stringify(workout))
export const exerciseVideoSearch=(site:'youtube'|'tiktok',name:string)=>site==='youtube'
  ?`https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} Planet Fitness proper form shorts`)}`
  :`https://www.google.com/search?q=${encodeURIComponent(`site:tiktok.com ${name} Planet Fitness exercise proper form video`)}`
const searchUrl=exerciseVideoSearch
const replacementId=(name:string)=>`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'exercise'}-${Date.now().toString(36)}`

export default function WorkoutEditor({store,setStore,baseWorkouts,workouts,toast}:{store:Store;setStore:(s:Store)=>void;baseWorkouts:Workout[];workouts:Workout[];toast:(s:string)=>void}){
  const [workoutId,setWorkoutId]=useState(workouts[0]?.id||'')
  const current=workouts.find(w=>w.id===workoutId)||workouts[0]
  const [draft,setDraft]=useState<Workout|undefined>(current&&clone(current))
  const [verified,setVerified]=useState<Record<string,boolean>>({})
  useEffect(()=>{setDraft(current&&clone(current));setVerified({})},[workoutId,current?.id])
  if(!draft)return null
  const original=current
  const changedIndexes=draft.exercises.map((e,i)=>e.name.trim()!==original.exercises[i]?.name.trim()?i:-1).filter(i=>i>=0)
  const updateExercise=(index:number,key:'name'|'cue',value:string)=>setDraft({...draft,exercises:draft.exercises.map((e,i)=>i===index?{...e,[key]:value}:e)})
  const save=()=>{
    if(!draft.title.trim()||draft.exercises.some(e=>!e.name.trim()))return toast('Workout and exercise names are required')
    if(changedIndexes.some(i=>!verified[i]))return toast('Open a video search and confirm each replacement first')
    const next={...draft,title:draft.title.trim(),focus:draft.focus.trim(),exercises:draft.exercises.map((e,i)=>e.name.trim()===original.exercises[i]?.name.trim()?e:{...e,id:replacementId(e.name),name:e.name.trim()})}
    setStore({...store,workoutOverrides:{...(store.workoutOverrides||{}),[next.id]:next}});setDraft(clone(next));setVerified({});toast('Workout changes saved')
  }
  const restore=()=>{const base=baseWorkouts.find(w=>w.id===workoutId);if(!base)return;const overrides={...(store.workoutOverrides||{})};delete overrides[workoutId];setStore({...store,workoutOverrides:overrides});setDraft(clone(base));setVerified({});toast('Original workout restored')}
  return <section className="panel workout-editor"><div className="panel-head"><div><span className="eyebrow">EDIT OR REPLACE WORKOUTS</span><h3>Customize your active plan</h3></div><span className="mini-status">Saved locally</span></div><p className="muted">Choose a workout, edit its title, or replace an exercise. Review live short-form video results before confirming a replacement. Previous exercise history remains intact.</p>
    <label className="editor-label"><span>Workout day</span><select value={workoutId} onChange={e=>setWorkoutId(e.target.value)}>{workouts.map(w=><option key={w.id} value={w.id}>{dayNames[w.day]} — {w.title}</option>)}</select></label>
    <div className="workout-meta-editor"><label className="editor-label"><span>Workout name</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label className="editor-label"><span>Focus</span><input value={draft.focus} onChange={e=>setDraft({...draft,focus:e.target.value})}/></label></div>
    <div className="replacement-list">{draft.exercises.map((exercise,index)=>{const changed=exercise.name.trim()!==original.exercises[index]?.name.trim();return <div className={`replacement-row ${changed?'changed':''}`} key={`${original.exercises[index]?.id||index}`}><span className="sequence">{index+1}</span><div><label className="editor-label"><span>Exercise name</span><input value={exercise.name} onChange={e=>{updateExercise(index,'name',e.target.value);setVerified({...verified,[index]:false})}}/></label><label className="editor-label"><span>Form cue</span><input value={exercise.cue} onChange={e=>updateExercise(index,'cue',e.target.value)}/></label>{changed&&<div className="video-validation"><a href={searchUrl('youtube',exercise.name)} target="_blank" rel="noreferrer">YouTube Shorts ↗</a><a href={searchUrl('tiktok',exercise.name)} target="_blank" rel="noreferrer">TikTok ↗</a><label><input type="checkbox" checked={!!verified[index]} onChange={e=>setVerified({...verified,[index]:e.target.checked})}/> I checked the movement and equipment</label></div>}</div><small>{exercise.sets} sets · {exercise.minReps}–{exercise.maxReps} reps</small></div>})}</div>
    <div className="button-row"><button className="primary" onClick={save}>Save workout changes</button>{store.workoutOverrides?.[workoutId]&&<button className="secondary" onClick={restore}>Restore original</button>}</div>
  </section>
}
