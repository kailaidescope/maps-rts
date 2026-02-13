import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './views/App.jsx'
import initBoundingBox from '../helpers/bbox.js'

console.log('[CRXJS] Hello world from content script!')

// enable bounding-box drag (middle click or alt+click)
try {
  initBoundingBox()
} catch (err) {
  console.warn('Failed to initialize bounding box helper', err)
}

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
