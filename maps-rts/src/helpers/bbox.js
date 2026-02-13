const TILE_SIZE = 256

function parseCenterZoomFromUrl(url) {
  // common pattern: @lat,lng,zoomz
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),([0-9\.]+)z/)
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2]),
      zoom: parseFloat(atMatch[3]),
    }
  }

  // fallback: !3dLAT!4dLNG sequences (zoom may not be available)
  const coordMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), zoom: 0 }
  }

  return null
}

function latLngToWorldPixel(lat, lng, zoom) {
  const scale = Math.pow(2, zoom)
  const worldSize = TILE_SIZE * scale
  const x = ((lng + 180) / 360) * worldSize
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize
  return { x, y }
}

function worldPixelToLatLng(x, y, zoom) {
  const scale = Math.pow(2, zoom)
  const worldSize = TILE_SIZE * scale
  const lng = (x / worldSize) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / worldSize
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n))
  return { lat, lng }
}

function screenPointToLatLng(px, py, center, zoom) {
  const worldCenter = latLngToWorldPixel(center.lat, center.lng, zoom)
  const worldX = worldCenter.x + (px - window.innerWidth / 2)
  const worldY = worldCenter.y + (py - window.innerHeight / 2)
  return worldPixelToLatLng(worldX, worldY, zoom)
}

function ensureStyles() {
  if (document.getElementById('crx-bbox-styles')) return
  const s = document.createElement('style')
  s.id = 'crx-bbox-styles'
  s.textContent = `
    .crx-bbox-overlay { position: fixed; inset: 0; z-index: 9999999; cursor: crosshair; }
    .crx-bbox-rect { position: absolute; border: 2px dashed #ff9800; background: rgba(255,152,0,0.08); }
    .crx-bbox-toast { position: fixed; right: 12px; bottom: 12px; background: rgba(0,0,0,0.7); color: #fff; padding:6px 10px; border-radius:6px; font-size:13px; z-index:10000000 }
    .crx-bbox-label { position: absolute; background: rgba(0,0,0,0.78); color: #fff; padding:6px 8px; border-radius:6px; font-size:12px; z-index:10000001; pointer-events:none; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.25); }
  `
  document.head.appendChild(s)
}

export function initBoundingBox() {
  console.log('[CRXJS] Initializing bounding box helper')
  ensureStyles()

  let overlay = null
  let rect = null
  let label = null
  let currentCenter = null
  let currentZoom = 0
  let startX = 0
  let startY = 0
  let dragging = false

  function showToast(text) {
    const t = document.createElement('div')
    t.className = 'crx-bbox-toast'
    t.textContent = text
    document.body.appendChild(t)
    setTimeout(() => t.remove(), 3000)
  }

  function onMouseDown(e) {
    console.log('[CRXJS] Startings bounding box drag')

    // Middle click OR Alt+Left for trackpad users
    if (!(e.button === 1 || (e.button === 0 && e.altKey))) return
    e.preventDefault()
    e.stopPropagation()

    if (!overlay) {
      overlay = document.createElement('div')
      overlay.className = 'crx-bbox-overlay'
      overlay.style.pointerEvents = 'auto'
      rect = document.createElement('div')
      rect.className = 'crx-bbox-rect'
      overlay.appendChild(rect)
      // label under the rectangle showing current bounds
      label = document.createElement('div')
      label.className = 'crx-bbox-label'
      label.textContent = ''
      overlay.appendChild(label)
      document.body.appendChild(overlay)
    }

    startX = e.clientX
    startY = e.clientY
    dragging = true

    // parse center/zoom once at drag start so we can update bounds live
    const parsedCenter = parseCenterZoomFromUrl(location.href)
    if (!parsedCenter) {
      showToast('Could not parse map center/zoom from URL')
      if (overlay) overlay.remove()
      overlay = null
      rect = null
      label = null
      dragging = false
      return
    }
    currentZoom = parsedCenter.zoom
    currentCenter = { lat: parsedCenter.lat, lng: parsedCenter.lng }

    function onMove(ev) {
      if (!dragging) return
      const x = Math.min(startX, ev.clientX)
      const y = Math.min(startY, ev.clientY)
      const w = Math.abs(ev.clientX - startX)
      const h = Math.abs(ev.clientY - startY)
      rect.style.left = x + 'px'
      rect.style.top = y + 'px'
      rect.style.width = w + 'px'
      rect.style.height = h + 'px'

      if (currentCenter) {
        const p1 = screenPointToLatLng(startX, startY, currentCenter, currentZoom)
        const p2 = screenPointToLatLng(ev.clientX, ev.clientY, currentCenter, currentZoom)
        const north = Math.max(p1.lat, p2.lat)
        const south = Math.min(p1.lat, p2.lat)
        const east = Math.max(p1.lng, p2.lng)
        const west = Math.min(p1.lng, p2.lng)
        const text = `N: ${north.toFixed(6)}  S: ${south.toFixed(6)}  E: ${east.toFixed(6)}  W: ${west.toFixed(6)}`
        if (label) {
          label.textContent = text
          // position label below the rect, but flip above if it would overflow
          label.style.left = x + 'px'
          // prefer below
          const belowTop = y + h + 8
          // force layout then measure
          label.style.top = belowTop + 'px'
          const lw = label.offsetWidth || 0
          const lh = label.offsetHeight || 0
          if (x + lw > window.innerWidth - 8) {
            label.style.left = Math.max(8, window.innerWidth - lw - 8) + 'px'
          }
          if (belowTop + lh > window.innerHeight - 8) {
            // place above the rectangle when there's no space below
            const aboveTop = Math.max(8, y - lh - 8)
            label.style.top = aboveTop + 'px'
          }
        }
      }
    }

    function onUp(ev) {
      dragging = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      const x1 = startX
      const y1 = startY
      const x2 = ev.clientX
      const y2 = ev.clientY

      if (!currentCenter) {
        showToast('Could not parse map center/zoom from URL')
        if (overlay) overlay.remove()
        overlay = null
        rect = null
        label = null
        return
      }

      const p1 = screenPointToLatLng(x1, y1, currentCenter, currentZoom)
      const p2 = screenPointToLatLng(x2, y2, currentCenter, currentZoom)

      const north = Math.max(p1.lat, p2.lat)
      const south = Math.min(p1.lat, p2.lat)
      const east = Math.max(p1.lng, p2.lng)
      const west = Math.min(p1.lng, p2.lng)

      const bounds = { north, south, east, west }
      // log, copy to clipboard, and dispatch an event
      console.log('[CRXJS] Bounding box:', bounds)
      try {
        navigator.clipboard.writeText(JSON.stringify(bounds))
      } catch (err) {}
      window.dispatchEvent(new CustomEvent('mapsBoundingBox', { detail: bounds }))
      showToast('Bounds copied to clipboard')

      if (overlay) overlay.remove()
      overlay = null
      rect = null
      label = null
      currentCenter = null
      currentZoom = 0
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // attach to document to catch clicks on the map
  document.addEventListener('mousedown', onMouseDown, true)
  console.log('[CRXJS] Bounding box helper initialized')
}

export default initBoundingBox
