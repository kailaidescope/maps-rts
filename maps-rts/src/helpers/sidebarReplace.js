import React from 'react'
import { createRoot } from 'react-dom/client'
import SidebarReplace from '../components/SidebarReplace.jsx'

function ensureStyles() {
  if (document.getElementById('crx-sidebar-styles')) return
  const s = document.createElement('style')
  s.id = 'crx-sidebar-styles'
  s.textContent = `
    .crx-sidebar-replace { font-family: Roboto, Arial, sans-serif; color: #202124; padding: 8px 12px; padding-top: 17%; }
    .crx-sidebar-cover { width: 100%; height: auto; display: block; border-radius:6px; overflow:hidden; margin-bottom:8px; }
    .crx-sidebar-cover img { width: 100%; height: auto; display:block; object-fit:cover; max-height: 21rem; }
    .crx-sidebar-title { font-size: 20px; font-weight: 500; margin: 4px 0; }
    .crx-sidebar-subtitle { font-size: 14px; color: #5f6368; margin-bottom: 8px; }
    .crx-sidebar-actions { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; width: 100%; }
    .crx-hello { background: #f1f3f4; border-radius:6px; padding:12px; text-align:center; color:#202124; }
    [aria-label*='Actions for'] { gap: 8px; width: 100%; box-sizing: border-box; }
  `
  document.head.appendChild(s)
}

function findActionsContainer(main) {
  // prefer explicit labeled action region
  const byAria = main.querySelector('[aria-label^="Actions for"]')
  if (byAria) return byAria

  // fallback: find a button with known labels and return its closest region
  const labels = ['Directions', 'Save', 'Nearby', 'Send to phone', 'Share']
  const buttons = Array.from(main.querySelectorAll('button'))
  for (const b of buttons) {
    const text = (b.getAttribute('aria-label') || b.textContent || '').trim()
    for (const lab of labels)
      if (text.indexOf(lab) === 0) return b.closest('[role="region"]') || b.parentElement
  }
  return null
}

export function initSidebarReplace() {
  ensureStyles()
  console.log('[CRXJS] Initializing sidebar replacer')
  // helper: wait until predicate returns a truthy value or timeout
  function waitFor(predicate, timeout = 1500) {
    return new Promise(resolve => {
      const val = predicate()
      if (val) return resolve(val)
      const obs = new MutationObserver(() => {
        const v = predicate()
        if (v) {
          obs.disconnect()
          clearTimeout(to)
          resolve(v)
        }
      })
      obs.observe(document.body, { childList: true, subtree: true, attributes: true })
      const to = setTimeout(() => {
        obs.disconnect()
        resolve(null)
      }, timeout)
    })
  }

  async function replaceMain(main) {
    try {
      if (!main || main.dataset.crxReplaced === '1') return

      // prefer element-only traversal and fallback to querying the img directly
      const buttonImgWrapper =
        main?.firstElementChild?.firstElementChild?.firstElementChild ||
        main?.querySelector('button')
      if (!buttonImgWrapper) {
        const found = await waitFor(() => main.querySelector('button'), 1500)
        if (!found) console.warn('[CRXJS] Timed out waiting for button inside sidebar')
      }
      const btnWrap = main.querySelector('button') || buttonImgWrapper
      const image = btnWrap?.querySelector('img') || btnWrap?.firstElementChild
      if (!image) {
        const found = await waitFor(() => btnWrap.querySelector('img'), 1500)
        if (!found) console.warn('[CRXJS] Timed out waiting for img inside sidebar')
      }

      const img = btnWrap?.querySelector('img') || btnWrap?.firstElementChild || image

      if (img?.tagName !== 'IMG' || btnWrap?.tagName !== 'BUTTON') {
        console.warn('[CRXJS] Unexpected sidebar structure, cannot find cover image/button')
        console.warn('[CRXJS] Structs', btnWrap, img)
      }

      const coverBtn = btnWrap
      const coverImg = img
      const title = main.querySelector('h1')
      const subtitle = main.querySelector('h2')
      const actions = findActionsContainer(main)

      // ensure hidden holder exists before moving originals
      let hidden = document.getElementById('crx-sidebar-hidden')
      if (!hidden) {
        hidden = document.createElement('div')
        hidden.id = 'crx-sidebar-hidden'
        hidden.style.cssText =
          'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;'
        document.body.appendChild(hidden)
      }

      // move originals into hidden holder to preserve handlers
      if (coverBtn) hidden.appendChild(coverBtn)
      if (actions) hidden.appendChild(actions)

      const coverSrc = coverImg?.src || null
      const titleHtml = title ? title.innerHTML : null
      const subtitleHtml = subtitle ? subtitle.innerHTML : null

      const origButtons = actions ? Array.from(actions.querySelectorAll('button')) : []
      const actionItems = origButtons.map(ob => {
        const label = (ob.getAttribute('aria-label') || ob.textContent || '').trim()
        return {
          label,
          onClick: () => {
            try {
              ob.click()
            } catch (e) {}
          },
        }
      })

      // clear main and render React component
      while (main.firstChild) main.removeChild(main.firstChild)
      const host = document.createElement('div')
      main.appendChild(host)

      const root = createRoot(host)
      root.render(
        React.createElement(SidebarReplace, {
          coverSrc,
          titleHtml,
          subtitleHtml,
          actions: actionItems,
        })
      )
      main.dataset.crxReplaced = '1'
      // store root for potential cleanup
      main.__crxRoot = root
      console.log('[CRXJS] Sidebar content replaced (React)')
    } catch (err) {
      console.error('[CRXJS] Sidebar replace failed', err)
    }
  }

  // observe for the role="main" container used by Google Maps
  const observer = new MutationObserver(() => {
    const main = document.querySelector('[role="main"]')
    if (main) replaceMain(main)
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // run once immediately if already present
  const existing = document.querySelector('[role="main"]')
  if (existing) replaceMain(existing)

  return () => observer.disconnect()
}

export default initSidebarReplace
