import { createHash } from 'node:crypto'

const requests = new Map()
const dailyUsage = new Map()
const monthlyUsage = new Map()
const responseCache = new Map()
const inFlight = new Set()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 6
const MAX_BODY_BYTES = 80_000
const DAILY_LIMITS = { ask: 30, 'generate-plan': 1 }
const CACHE_MS = 10 * 60_000

function rateLimited(ip) {
  const now = Date.now()
  const recent = (requests.get(ip) || []).filter(time => now - time < WINDOW_MS)
  recent.push(now)
  requests.set(ip, recent)
  return recent.length > MAX_REQUESTS
}

function easternPeriod() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date())
  const get = type => parts.find(part => part.type === type)?.value || ''
  return { day:`${get('year')}-${get('month')}-${get('day')}`, month:`${get('year')}-${get('month')}` }
}
function usageKey(ip, action, period) { return `${period}:${ip}:${action}` }
function getUsage(map, key) { return Number(map.get(key) || 0) }
function usageSnapshot(ip, action) {
  const period = easternPeriod(), key = usageKey(ip, action, period.day), used = getUsage(dailyUsage, key), limit = DAILY_LIMITS[action]
  return { period:period.day, action, used, limit, remaining:Math.max(0,limit-used) }
}
function cleanCache() { const now=Date.now(); for(const [key,value] of responseCache)if(now-value.createdAt>CACHE_MS)responseCache.delete(key) }

function systemInstruction(action) {
  const privacy = 'Use only the aggregate context supplied. Do not request photographs, raw workout rows, raw meal rows, medical records, or identifying information. Do not diagnose illness or injury. Be conservative and clearly distinguish general fitness guidance from medical advice.'
  if (action === 'generate-plan') return `${privacy}\nReturn only valid JSON using schemaVersion fittrack-plan-v1. The top-level fields must be schemaVersion, planId, name, startDate, endDate, dietaryConstraints, workouts, and mealsByDay. Workout day is 0-6. Every workout has id, day, title, focus, tone (green or blue), and exercises. Every exercise has id, name, sets, minReps, maxReps, rest, cue, increment, and optional startingWeight. mealsByDay must contain keys 0 through 6. Every meal has id, time, name, detail, calories, and protein. Indian diet only; chicken is the only meat; eggs and dairy are allowed; never include pork, beef, fish, soy, tofu, tempeh, or edamame. Keep changes conservative and preserve useful exercise IDs when possible.`
  return `${privacy}\nYou are FitTrack AI Coach. Answer the user's specific question concisely using their aggregate trends and active-plan context. Explain reasoning in plain language. Never claim certainty from smart-scale body-composition estimates. Never prescribe treatment.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  if (String(process.env.GEMINI_AI_ENABLED || 'true').toLowerCase() === 'false') return res.status(503).json({ error: 'AI Coach is temporarily disabled by the monthly Vercel kill switch.' })
  const origin = req.headers.origin
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (origin && host && new URL(origin).host !== host) return res.status(403).json({ error: 'Cross-origin requests are not allowed.' })
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini is not configured.' })
  const length = Number(req.headers['content-length'] || 0)
  if (length > MAX_BODY_BYTES) return res.status(413).json({ error: 'Request is too large.' })
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0]
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait one minute.' })

  const { action, question, review } = req.body || {}
  if (!['ask', 'generate-plan'].includes(action)) return res.status(400).json({ error: 'Unsupported action.' })
  if (!review || review.schemaVersion !== 'fittrack-coach-review-v1') return res.status(400).json({ error: 'A valid aggregate Coach Review is required.' })
  if (action === 'ask' && (typeof question !== 'string' || !question.trim() || question.length > 1200)) return res.status(400).json({ error: 'Enter a question up to 1,200 characters.' })

  const period = easternPeriod()
  const dailyKey = usageKey(ip, action, period.day)
  const dailyLimit = DAILY_LIMITS[action]
  if (getUsage(dailyUsage,dailyKey) >= dailyLimit) return res.status(429).json({ error: `Daily ${action==='ask'?'Ask Coach':'plan generation'} limit reached. It resets at midnight Eastern.`, usage:usageSnapshot(ip,action) })
  const monthlyLimit = Number(process.env.GEMINI_MONTHLY_REQUEST_LIMIT || 0)
  const monthlyKey = usageKey(ip,'all',period.month)
  if (monthlyLimit > 0 && getUsage(monthlyUsage,monthlyKey) >= monthlyLimit) return res.status(429).json({ error: 'Monthly AI Coach limit reached. Increase GEMINI_MONTHLY_REQUEST_LIMIT or wait for next month.' })

  const models = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-3.5-flash-lite'].filter(Boolean))]
  const prompt = action === 'generate-plan'
    ? `Create the next four-week plan from this aggregate review. Today in U.S. Eastern time is ${easternPeriod().day}.\n\n${JSON.stringify(review)}`
    : `Question: ${question.trim()}\n\nAggregate FitTrack context:\n${JSON.stringify(review)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  const fingerprint = createHash('sha256').update(JSON.stringify({action,question:question?.trim(),review})).digest('hex')
  cleanCache()
  const cached = responseCache.get(fingerprint)
  if (cached) { clearTimeout(timeout); return res.status(200).json({...cached.payload,cached:true,usage:usageSnapshot(ip,action)}) }
  if (inFlight.has(fingerprint)) { clearTimeout(timeout); return res.status(409).json({ error:'This identical request is already running. Please wait for it to finish.' }) }
  inFlight.add(fingerprint)
  try {
    let lastError = null
    for (const model of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction(action) }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: action === 'generate-plan'
            ? { maxOutputTokens: 5000, responseMimeType: 'application/json' }
            : { maxOutputTokens: 1200 },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
        if (!text) return res.status(502).json({ error: 'Gemini returned an empty or safety-blocked response.' })
        res.setHeader('Cache-Control', 'no-store')
        dailyUsage.set(dailyKey,getUsage(dailyUsage,dailyKey)+1)
        monthlyUsage.set(monthlyKey,getUsage(monthlyUsage,monthlyKey)+1)
        const payload={text,model}
        responseCache.set(fingerprint,{createdAt:Date.now(),payload})
        return res.status(200).json({...payload,cached:false,usage:usageSnapshot(ip,action)})
      }
      lastError = { status: response.status, message: String(data?.error?.message || '') }
      if (![400, 404].includes(response.status) || !/model|not found|not supported/i.test(lastError.message)) break
    }
    if (lastError?.status === 429) return res.status(429).json({ error: 'Gemini free-tier quota is temporarily exhausted. Check Google AI Studio usage or try again later.' })
    if ([401,403].includes(lastError?.status)) return res.status(502).json({ error: `Gemini rejected the API key or project permissions (${lastError.status}). Verify the key in Google AI Studio and Vercel Production settings.` })
    const safeDetail = lastError?.message.replace(/AIza[\w-]+/g, '[redacted]').slice(0, 240)
    return res.status(502).json({ error: safeDetail ? `Gemini request failed: ${safeDetail}` : 'Gemini could not complete the request.' })
  } catch (error) {
    return res.status(502).json({ error: error?.name === 'AbortError' ? 'Gemini timed out. Try again.' : 'Gemini is temporarily unavailable.' })
  } finally { clearTimeout(timeout); inFlight.delete(fingerprint) }
}
