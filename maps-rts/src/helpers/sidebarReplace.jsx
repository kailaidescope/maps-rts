import React, { StrictMode, useEffect, useState } from 'react'
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

// Manager component: mounts once, observes for the main container,
// stores the found main node in state and runs the replacement pipeline
// whenever the main node changes.
function SidebarReplaceManager() {
  const [mainNode, setMainNode] = useState(() => document.querySelector('[role="main"]'))
  const [sidebarProps, setSidebarProps] = useState({
    coverSrc: null,
    titleHtml: null,
    subtitleHtml: null,
    actions: [],
  })
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const m = document.querySelector('[role="main"]')
      if (m !== mainNode) setMainNode(m)
    })
    obs.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!mainNode) return
    let cancelled = false

    async function runPipeline(main) {
      try {
        if (!main) return

        // avoid duplicate processing
        if (main.dataset && main.dataset.crxHidden === '1') return

        console.log('[CRXJS] Manager: starting replacement pipeline (hide + extract props)')

        function localWaitFor(predicate, timeout = 1500) {
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

        // locate cover/button and image
        const buttonImgWrapper =
          main?.firstElementChild?.firstElementChild?.firstElementChild ||
          main?.querySelector('button')
        if (!buttonImgWrapper) {
          const found = await localWaitFor(() => main.querySelector('button'), 1500)
          if (!found) console.warn('[CRXJS] Timed out waiting for button inside sidebar')
        }

        const btnWrap = main.querySelector('button') || buttonImgWrapper
        const image = btnWrap?.querySelector('img') || btnWrap?.firstElementChild
        if (!image) {
          const found = await localWaitFor(
            () => btnWrap && btnWrap.querySelector && btnWrap.querySelector('img'),
            1500
          )
          if (!found) console.warn('[CRXJS] Timed out waiting for img inside sidebar')
        }

        const img =
          (btnWrap && btnWrap.querySelector && btnWrap.querySelector('img')) ||
          btnWrap?.firstElementChild ||
          image

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
        const titleHtml = title ? title.innerHTML || title.textContent || null : null
        const subtitleHtml = subtitle ? subtitle.innerHTML || subtitle.textContent || null : null

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

        const props = { coverSrc, titleHtml, subtitleHtml, actions: actionItems }

        // hide the original google sidebar (keep it in DOM for handlers)
        try {
          main.style.display = 'none'
        } catch (e) {
          main.hidden = true
        }
        main.dataset.crxHidden = '1'

        // send props to our local SidebarReplace instance
        setSidebarProps(props)
        console.log('[CRXJS] Manager: extracted props and hid original sidebar')
      } catch (err) {
        console.error('[CRXJS] Manager pipeline failed', err)
      }
    }

    runPipeline(mainNode)

    return () => {
      cancelled = true
    }
  }, [mainNode])

  useEffect(() => {
    console.log('[CRXJS] Sidebar props updated', sidebarProps)
  }, [sidebarProps])

  return <SidebarReplace {...sidebarProps}></SidebarReplace>
}

export function initSidebarReplace() {
  ensureStyles()
  console.log('[CRXJS] Initializing sidebar replacer')

  // Ensure we mount the manager only once and keep a reference to the root for cleanup
  let managerHost = document.getElementById('crx-sidebar-manager')
  if (!managerHost) {
    managerHost = document.createElement('div')
    managerHost.id = 'crx-sidebar-manager'
    // keep offscreen and non-interfering
    managerHost.style.cssText =
      'position:fixed; left:0; top:0; pointer-events:none; width:1px; height:1px;'
    document.body.appendChild(managerHost)
  }

  managerHost.style.border = '2px red solid'
  console.log('[CRXJS] Manager host:', managerHost)
  const managerRoot = createRoot(managerHost)
  managerRoot.render(
    <StrictMode>
      <h1>Hi!</h1>
      <SidebarReplaceManager />
    </StrictMode>
  )
}

export default initSidebarReplace
