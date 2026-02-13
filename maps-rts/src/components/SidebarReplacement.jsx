import React, { useEffect, useRef, useState } from 'react'
import './SidebarReplacement.scss'

export default function SidebarReplacement({ coverSrc, titleText, subtitleText, actions = [] }) {
  useEffect(() => {
    console.log('[CRXJS] Rendering SidebarReplacement with props', {
      coverSrc,
      titleText,
      subtitleText,
      actions,
    })
  }, [])

  return (
    <div id='crx-sidebar-replace' className='crx-sidebar-replace'>
      {coverSrc && (
        <div className='crx-sidebar-cover'>
          <img src={coverSrc} alt='' style={{ width: '100%', height: 'auto' }} />
        </div>
      )}

      {titleText && <div className='crx-sidebar-title'>{titleText}</div>}

      {subtitleText && <div className='crx-sidebar-subtitle'>{subtitleText}</div>}

      {actions && actions.length > 0 && (
        <div className='crx-sidebar-actions'>
          {actions.map((a, i) => (
            <button
              key={i}
              aria-label={a.label}
              onClick={ev => {
                ev.preventDefault()
                ev.stopPropagation()
                try {
                  a.onClick && a.onClick()
                } catch (e) {}
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className='crx-hello'>Hello World</div>
      <div className='crx-test-buttons'>
        <button>Click me</button>
        <button id='world-annihilator-button'>World Annihilator</button>
      </div>
    </div>
  )
}
