import React, { useEffect, useRef, useState } from 'react'
import './SidebarReplace.scss'

export default function SidebarReplace({ coverSrc, titleHtml, subtitleHtml, actions = [] }) {
  const [state, setState] = useState({
    coverSrc: null,
    titleText: null,
    subtitleText: null,
    actions: [],
  })
  const stateSetTimes = useRef(0)

  useEffect(() => {
    console.log('[CRXJS] Rendering SidebarReplace with', {
      coverSrc,
      titleHtml,
      subtitleHtml,
      actions,
    })

    setState(prev => {
      const next = { ...prev }

      if (coverSrc != null && !prev.coverSrc) next.coverSrc = coverSrc

      const incomingTitleText =
        titleHtml && typeof titleHtml === 'object' && 'textContent' in titleHtml
          ? titleHtml.textContent
          : typeof titleHtml === 'string'
            ? titleHtml
            : null
      if (incomingTitleText != null && !prev.titleText) next.titleText = incomingTitleText

      const incomingSubtitleText =
        subtitleHtml && typeof subtitleHtml === 'object' && 'textContent' in subtitleHtml
          ? subtitleHtml.textContent
          : typeof subtitleHtml === 'string'
            ? subtitleHtml
            : null
      if (incomingSubtitleText != null && !prev.subtitleText)
        next.subtitleText = incomingSubtitleText

      if (
        actions != null &&
        Array.isArray(actions) &&
        actions.length > 0 &&
        (!prev.actions || prev.actions.length === 0)
      ) {
        next.actions = actions
      }

      return next
    })

    console.log('[CRXJS] State update scheduled', stateSetTimes.current)
    stateSetTimes.current++
  }, [coverSrc, titleHtml, subtitleHtml, actions])

  useEffect(() => {
    console.log('[CRXJS] State updated', state)
  }, [state])

  return (
    <div id='crx-sidebar-replace' className='crx-sidebar-replace'>
      {(() => {
        const cover = state.coverSrc ?? coverSrc
        const titleText =
          state.titleText ??
          (titleHtml && (typeof titleHtml === 'object' ? titleHtml.textContent : titleHtml))
        const subtitleText =
          state.subtitleText ??
          (subtitleHtml &&
            (typeof subtitleHtml === 'object' ? subtitleHtml.textContent : subtitleHtml))
        const activeActions = state.actions ?? actions

        return (
          <>
            {cover && (
              <div className='crx-sidebar-cover'>
                <img src={cover} alt='' style={{ width: '100%', height: 'auto' }} />
              </div>
            )}

            {titleText && <div className='crx-sidebar-title'>{titleText}</div>}

            {subtitleText && <div className='crx-sidebar-subtitle'>{subtitleText}</div>}

            {activeActions && activeActions.length > 0 && (
              <div className='crx-sidebar-actions'>
                {activeActions.map((a, i) => (
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
          </>
        )
      })()}

      <div className='crx-hello'>Hello World</div>
      <div className='crx-test-buttons'>
        <button>Click me</button>
        <button id='world-annihilator-button'>World Annihilator</button>
      </div>
    </div>
  )
}
