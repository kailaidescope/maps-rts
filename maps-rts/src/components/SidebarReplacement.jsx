import React, { useCallback, useEffect, useMemo } from 'react'
import './SidebarReplacement.scss'

export default function SidebarReplacement({
    coverSrc,
    titleText,
    subtitleText,
    actions = [],
    state,
}) {
    useEffect(() => {
        console.log('[CRXJS] Rendering SidebarReplacement with props', {
            coverSrc,
            titleText,
            subtitleText,
            actions,
        })
    }, [])

    const addBuilding = useCallback(() => {
        state.addBuildingToCity(titleText, { name: 'Fort', level: 1 })

        console.log("[CRXJS] Added 'Fort' building to city", state.cities)
    }, [state, titleText])

    const buildings = useMemo(() => {
        if (!titleText || !state.cities[titleText] || !state.cities[titleText].buildings) return {}
        return state.cities[titleText].buildings
    }, [state, titleText])

    useEffect(() => {
        console.log('[CRXJS] Buildings for city', titleText, buildings)
    }, [buildings])

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
                <button id='world-annihilator-button' onClick={addBuilding}>
                    World Annihilator
                </button>
            </div>

            {/* Buildings list for this city */}
            <div className='crx-buildings-list'>
                <div className='crx-buildings-title'>Buildings</div>
                {(!buildings || Object.keys(buildings).length === 0) && (
                    <div className='crx-no-buildings'>No buildings</div>
                )}
                {buildings && Object.keys(buildings).length > 0 && (
                    <ul>
                        {Object.entries(buildings).map(([name, building]) => {
                            return (
                                <li key={name}>
                                    <strong>{name}</strong>
                                    {building.level !== undefined && (
                                        <span>Lv {building.level}</span>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
