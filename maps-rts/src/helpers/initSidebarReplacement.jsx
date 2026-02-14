import React, { StrictMode, useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import SidebarReplacement from '../components/SidebarReplacement.jsx'
import SidebarManager from '../components/SidebarManager.jsx'

export function initSidebarReplacement() {
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
