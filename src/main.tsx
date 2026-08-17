import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './fonts.css'
import './styles.css'
import './interactions.css'
import './coach.css'
import './gemini.css'
import './instructions.css'
import './usage.css'
import './date-navigation.css'
import './workout-editor.css'
import './video-guide.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    const registration=await navigator.serviceWorker.register('/sw.js')
    await registration.update()
  })
}
