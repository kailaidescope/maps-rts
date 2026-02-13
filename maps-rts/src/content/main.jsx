import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './views/App.jsx'
import initBoundingBox from '../helpers/bbox.js'
import initSidebarReplace from '../helpers/sidebarReplace.jsx'

console.log('[CRXJS] Hello world from content script!')

// Enable bounding-box drag (middle click or alt+click)
try {
  initBoundingBox()
} catch (err) {
  console.warn('Failed to initialize bounding box helper', err)
}

try {
  initSidebarReplace()
} catch (err) {
  console.warn('Failed to initialize sidebar replacer', err)
}

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
