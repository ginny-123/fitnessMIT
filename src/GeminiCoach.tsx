import { useMemo, useState } from 'react'
import type { Store } from './storage'
import type { Workout } from './data'
import { downloadText, makeCoachReview, validatePlan } from './coach'

type LocalUsage={date:string;ask:number;plan:number}
const USAGE_KEY='fittrack-gemini-usage-v1'
function easternDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function loadUsage():LocalUsage{const date=easternDate();try{const saved=JSON.parse(localStorage.getItem(USAGE_KEY)||'');return saved.date===date?saved:{date,ask:0,plan:0}}catch{return{date,ask:0,plan:0}}}

export default function GeminiCoach({store,activeWorkouts}:{store:Store;activeWorkouts:Workout[]}){
  const [question,setQuestion]=useState('')
  const [answer,setAnswer]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState<'ask'|'generate-plan'|''>('')
  const [usage,setUsage]=useState<LocalUsage>(loadUsage)
  const review=useMemo(()=>makeCoachReview(store,activeWorkouts,4,{goals:'Build muscle while keeping waist gain controlled.',recovery:'',equipment:'',constraints:'Chicken only for meat; eggs and dairy allowed; no soy.',pain:''}),[store,activeWorkouts])
  const saveUsage=(next:LocalUsage)=>{setUsage(next);localStorage.setItem(USAGE_KEY,JSON.stringify(next))}
  const call=async(action:'ask'|'generate-plan')=>{
    const current=usage.date===easternDate()?usage:{date:easternDate(),ask:0,plan:0}
    if(action==='ask'&&current.ask>=30){setError('Daily Ask Coach limit reached. It resets at midnight Eastern.');return}
    if(action==='generate-plan'&&current.plan>=1){setError('Today’s plan generation has already been used. It resets at midnight Eastern.');return}
    if(busy)return
    setBusy(action);setError('');if(action==='ask')setAnswer('')
    try{
      const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,question,review})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Request failed.')
      if(!data.cached){const next={...current,ask:current.ask+(action==='ask'?1:0),plan:current.plan+(action==='generate-plan'?1:0)};saveUsage(next)}
      if(action==='ask')setAnswer(data.text)
      else{
        let parsed
        try{parsed=JSON.parse(data.text)}catch{throw new Error('Gemini returned plan text that was not valid JSON.')}
        const validation=validatePlan(parsed)
        if(validation.errors.length)throw new Error(`Generated plan did not pass validation: ${validation.errors.slice(0,3).join(' ')}`)
        downloadText('fittrack-gemini-plan.json',JSON.stringify(validation.plan,null,2),'application/json')
      }
    }catch(e){setError(e instanceof Error?e.message:'The request failed.')}
    finally{setBusy('')}
  }
  return <section className="panel gemini-coach">
    <div className="panel-head"><div><span className="eyebrow">GEMINI · AGGREGATE CONTEXT ONLY</span><h3>AI Coach</h3></div><span className="mini-status">Optional</span></div>
    <div className="usage-strip"><div><span>Ask Coach today</span><b>{usage.ask}<small>/30</small></b><i><em style={{width:`${usage.ask/30*100}%`}}/></i></div><div><span>Plans today</span><b>{usage.plan}<small>/1</small></b><i><em style={{width:`${usage.plan*100}%`}}/></i></div><p>Resets midnight Eastern · cached repeats do not consume usage</p></div>
    <p className="muted">Questions send your privacy-minimized four-week Coach Review to Gemini. Photos and raw workout or meal rows are not included. No requests run automatically.</p>
    <label className="coach-question"><span>Ask about your training, nutrition, or trends</span><textarea maxLength={1200} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Example: Why has my chest press stalled, and what should I change next week?"/></label>
    <div className="button-row"><button className="primary" disabled={!question.trim()||!!busy||usage.ask>=30} onClick={()=>call('ask')}>{busy==='ask'?'Asking Gemini…':'Ask Coach'}</button><button className="secondary" disabled={!!busy||usage.plan>=1} onClick={()=>call('generate-plan')}>{busy==='generate-plan'?'Generating…':'Generate next plan JSON'}</button></div>
    {error&&<div className="ai-error">{error}</div>}{answer&&<div className="ai-answer"><b>Coach response</b><p>{answer}</p></div>}
    <p className="ai-caveat">AI suggestions are reviewed by you. Generated plans are downloaded and must still pass FitTrack’s import comparison before activation.</p>
  </section>
}
