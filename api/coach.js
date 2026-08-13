const requests = new Map()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 6
const MAX_BODY_BYTES = 80_000

function rateLimited(ip) {
  const now = Date.now()
  const recent = (requests.get(ip) || []).filter(time => now - time < WINDOW_MS)
  recent.push(now)
  requests.set(ip, recent)
  return recent.length > MAX_REQUESTS
}

function systemInstruction(action) {
  const privacy = 'Use only the aggregate context supplied. Do not request photographs, raw workout rows, raw meal rows, medical records, or identifying information. Do not diagnose illness or injury. Be conservative and clearly distinguish general fitness guidance from medical advice.'
  if (action === 'generate-plan') return `${privacy}\nReturn only valid JSON using schemaVersion fittrack-plan-v1. The top-level fields must be schemaVersion, planId, name, startDate, endDate, dietaryConstraints, workouts, and mealsByDay. Workout day is 0-6. Every workout has id, day, title, focus, tone (green or blue), and exercises. Every exercise has id, name, sets, minReps, maxReps, rest, cue, increment, and optional startingWeight. mealsByDay must contain keys 0 through 6. Every meal has id, time, name, detail, calories, and protein. Indian diet only; chicken is the only meat; eggs and dairy are allowed; never include pork, beef, fish, soy, tofu, tempeh, or edamame. Keep changes conservative and preserve useful exercise IDs when possible.`
  return `${privacy}\nYou are FitTrack AI Coach. Answer the user's specific question concisely using their aggregate trends and active-plan context. Explain reasoning in plain language. Never claim certainty from smart-scale body-composition estimates. Never prescribe treatment.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
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

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const prompt = action === 'generate-plan'
    ? `Create the next four-week plan from this aggregate review. Today is ${new Date().toISOString().slice(0, 10)}.\n\n${JSON.stringify(review)}`
    : `Question: ${question.trim()}\n\nAggregate FitTrack context:\n${JSON.stringify(review)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction(action) }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: action === 'generate-plan'
          ? { temperature: 0.25, maxOutputTokens: 8192, responseMimeType: 'application/json' }
          : { temperature: 0.35, maxOutputTokens: 1200 },
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502
      return res.status(status).json({ error: response.status === 429 ? 'Gemini free-tier quota is temporarily exhausted. Try again later.' : 'Gemini could not complete the request.' })
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
    if (!text) return res.status(502).json({ error: 'Gemini returned an empty response.' })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ text })
  } catch (error) {
    return res.status(502).json({ error: error?.name === 'AbortError' ? 'Gemini timed out. Try again.' : 'Gemini is temporarily unavailable.' })
  } finally { clearTimeout(timeout) }
}
