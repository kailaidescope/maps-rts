import React from 'react'
import './SidebarReplace.scss'

export default function SidebarReplace({ coverSrc, titleHtml, subtitleHtml, actions = [] }) {
  return (
    <div id='crx-sidebar-replace' className='crx-sidebar-replace'>
      {coverSrc && (
        <div className='crx-sidebar-cover'>
          <img src={coverSrc} alt='' style={{ width: '100%', height: 'auto' }} />
        </div>
      )}

      {titleHtml && (
        <div className='crx-sidebar-title' dangerouslySetInnerHTML={{ __html: titleHtml }} />
      )}

      {subtitleHtml && (
        <div className='crx-sidebar-subtitle' dangerouslySetInnerHTML={{ __html: subtitleHtml }} />
      )}

      {actions.length > 0 && (
        <div className='crx-sidebar-actions'>
          {actions.map((a, i) => (
            <button
              key={i}
              aria-label={a.label}
              onClick={ev => {
                ev.preventDefault()
                ev.stopPropagation()
                try {
                  a.onClick()
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
