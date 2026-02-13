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

    const addBuilding = useCallback(
        (name = 'Fort', level = 1) => {
            state.addBuildingToCity(titleText, { name, level })

            console.log(`[CRXJS] Added '${name}' building (Lv ${level}) to city`, state.cities)
        },
        [state, titleText]
    )

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

            <div className='crx-test-buttons'>
                <button onClick={() => addBuilding('Fort', 1)}>Add Fort (Lv 1)</button>
                <button onClick={() => addBuilding('Barracks', 2)}>Add Barracks (Lv 2)</button>
                <button onClick={() => addBuilding('Market', 1)}>Add Market (Lv 1)</button>
                <button onClick={() => addBuilding('Castle', 1)}>Add Castle (Lv 1)</button>
                <button onClick={() => addBuilding('Temple', 3)}>Add Temple (Lv 3)</button>
                <button
                    id='world-annihilator-button'
                    onClick={() => addBuilding('World Annihilator', 10)}
                >
                    World Annihilator
                </button>
            </div>
            <div className='crx-hello'>Constructed Buildings:</div>

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
