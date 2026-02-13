import React, { StrictMode, useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import SidebarReplacement from '../components/SidebarReplacement.jsx'
import SidebarManager from '../components/SidebarManager.jsx'

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

export function initSidebarReplacement() {
    ensureStyles()
    console.log('[CRXJS] Initializing sidebar replacer')

    // Ensure we mount the manager only once and keep a reference to the root for cleanup
    let managerHost = document.getElementById('crx-sidebar-manager')
    if (!managerHost) {
        const clickableArea = document.body.querySelector('div')

        managerHost = document.createElement('div')
        managerHost.id = 'crx-wrapper'
        // keep offscreen and non-interfering
        managerHost.style.cssText =
            'position:fixed; left:0; top:0; width: 1px; height: 1px; display: block;'
        clickableArea.appendChild(managerHost)
    }

    managerHost.style.border = '2px red solid'
    console.log('[CRXJS] Manager host:', managerHost)
    const managerRoot = createRoot(managerHost)
    managerRoot.render(
        <StrictMode>
            <SidebarManager>
                <SidebarReplacement />
            </SidebarManager>
        </StrictMode>
    )
}

export default initSidebarReplacement
