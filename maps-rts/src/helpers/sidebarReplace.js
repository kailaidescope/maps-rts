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
        // wait up to 1500ms for a button to appear inside main
        const found = await waitFor(() => main.querySelector('button'), 1500)
        if (!found) console.warn('[CRXJS] Timed out waiting for button inside sidebar')
      }
      const btnWrap = main.querySelector('button') || buttonImgWrapper
      const image = btnWrap?.querySelector('img') || btnWrap?.firstElementChild
      if (!image) {
        // wait up to 1500ms for a button to appear inside main
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

      // build replacement wrapper
      const wrapper = document.createElement('div')
      wrapper.className = 'crx-sidebar-replace'

      // For visuals, clone cover/title/subtitle. For action buttons we clone visually
      // but delegate clicks to the original buttons which we move into a hidden holder
      if (coverImg || coverBtn) {
        // ensure hidden holder exists before moving originals
        let hidden = document.getElementById('crx-sidebar-hidden')
        if (!hidden) {
          hidden = document.createElement('div')
          hidden.id = 'crx-sidebar-hidden'
          hidden.style.cssText =
            'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;'
          document.body.appendChild(hidden)
        }

        const cwrap = document.createElement('div')
        cwrap.className = 'crx-sidebar-cover'

        if (coverBtn) {
          // move original into hidden holder to preserve handlers
          hidden.appendChild(coverBtn)
        }

        if (coverImg) {
          // clone the image itself for visuals, scale to fit
          const imgClone = coverImg.cloneNode(true)
          imgClone.removeAttribute('id')
          imgClone.style.width = '100%'
          imgClone.style.height = 'auto'
          imgClone.style.position = 'static'
          imgClone.style.transform = 'none'
          // delegate click to original button if available
          if (coverBtn) {
            imgClone.addEventListener('click', ev => {
              ev.preventDefault()
              ev.stopPropagation()
              try {
                coverBtn.click()
              } catch (e) {}
            })
          }
          cwrap.appendChild(imgClone)
        }

        wrapper.appendChild(cwrap)
      }

      if (title) {
        const t = document.createElement('div')
        t.className = 'crx-sidebar-title'
        const titleClone = title.cloneNode(true)
        t.appendChild(titleClone)
        wrapper.appendChild(t)
      }

      if (subtitle) {
        const s = document.createElement('div')
        s.className = 'crx-sidebar-subtitle'
        const subClone = subtitle.cloneNode(true)
        s.appendChild(subClone)
        wrapper.appendChild(s)
      }

      if (actions) {
        // ensure a hidden holder exists on the page to keep originals (so handlers remain attached)
        let hidden = document.getElementById('crx-sidebar-hidden')
        if (!hidden) {
          hidden = document.createElement('div')
          hidden.id = 'crx-sidebar-hidden'
          hidden.style.cssText =
            'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;'
          document.body.appendChild(hidden)
        }

        // move original actions into hidden holder
        hidden.appendChild(actions)

        // create visual clone and wire clicks to originals
        const a = document.createElement('div')
        a.className = 'crx-sidebar-actions'
        const actionsClone = actions.cloneNode(true)
        a.appendChild(actionsClone)

        // delegate clicks from clone to original buttons by matching aria-label or text
        const origButtons = Array.from(actions.querySelectorAll('button'))
        const cloneButtons = Array.from(actionsClone.querySelectorAll('button'))
        cloneButtons.forEach(cb => {
          const lab = (cb.getAttribute('aria-label') || cb.textContent || '').trim()
          const match = origButtons.find(ob => {
            const obLab = (ob.getAttribute('aria-label') || ob.textContent || '').trim()
            return obLab === lab || (lab && obLab.indexOf(lab) !== -1)
          })
          if (match) {
            cb.addEventListener('click', ev => {
              ev.preventDefault()
              ev.stopPropagation()
              try {
                match.click()
              } catch (e) {}
            })
          }
        })

        wrapper.appendChild(a)
      }

      const hello = document.createElement('div')
      hello.className = 'crx-hello'
      hello.textContent = 'Hello World'
      wrapper.appendChild(hello)

      // remove everything from main and attach our wrapper
      while (main.firstChild) main.removeChild(main.firstChild)
      main.appendChild(wrapper)
      main.dataset.crxReplaced = '1'
      console.log('[CRXJS] Sidebar content replaced')
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
