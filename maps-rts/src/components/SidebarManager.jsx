import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import SidebarReplacement from './SidebarReplacement.jsx'
import './SidebarManager.scss'

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
export default function SidebarManager({ children }) {
    const [mainNode, setMainNode] = useState(() => document.querySelector('[role="main"]'))
    const [sidebarProps, setSidebarProps] = useState({
        coverSrc: null,
        titleText: null,
        subtitleText: null,
        actions: [],
    })
    const [googleSidebarWrapper, setGoogleSidebarWrapper] = useState(null)
    const [currentWidth, setCurrentWidth] = useState('200px')
    const [currentTransform, setCurrentTransform] = useState('translateX(0)')
    const [currentTransition, setCurrentTransition] = useState('transform 0.3s ease-out')

    const [cities, setCities] = useState({})

    const updateCities = useCallback(
        newCity => {
            if (!newCity || !newCity.name) return

            const name = newCity.name

            if (!(name in cities)) {
                cities[name] = { ...newCity }
                if (!('buildings' in cities[name])) {
                    cities[name].buildings = {}
                }
            }
            setCities({ ...cities }) // Trigger re-render with updated state
        },
        [cities]
    )

    const addBuildingToCity = useCallback(
        (cityName, building) => {
            if (!cityName || !building) return

            updateCities({ name: cityName }) // Ensure city exists

            const city = cities[cityName]
            if (!city) return

            if (!building.name) return

            if (building.name in city.buildings && building.level) {
                city.buildings[building.name].level =
                    building.level + (city.buildings[building.name].level || 0)

                setCities({ ...cities }) // Trigger re-render with updated state
                return
            }

            city.buildings[building.name] = building

            setCities({ ...cities }) // Trigger re-render with updated state
            return
        },
        [cities]
    )

    const updateSidebarProps = useCallback(
        newProps => {
            if (!newProps) return
            setSidebarProps(prevProps => ({ ...prevProps, state: { cities, addBuildingToCity } }))

            // Reset for a completely new location
            if (onNewLocation(newProps)) {
                setSidebarProps({ ...newProps, state: { cities, addBuildingToCity } })
                return
            }

            // Otherwise keep a consistent set of props
            Object.keys(newProps).forEach(key => {
                if (newProps[key] !== null) {
                    setSidebarProps(prevProps => ({
                        ...prevProps,
                        [key]: newProps[key],
                    }))
                }
            })
        },
        [cities]
    )

    const onNewLocation = newProps => {
        if (!newProps) return

        Object.keys(newProps).forEach(key => {
            if (newProps[key] !== null && newProps[key] !== sidebarProps[key]) {
                return true
            }
        })
        return false
    }

    useEffect(() => {
        const obs = new MutationObserver(() => {
            const m = document.querySelector('[role="main"]')
            if (m !== mainNode) setMainNode(m)
        })
        obs.observe(document.body, { childList: true, subtree: true, attributes: true })
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!mainNode) {
            return
        }
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
                        obs.observe(document.body, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                        })
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
                        'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; display: none;'
                    document.body.appendChild(hidden)
                }

                hidden.replaceChildren() // clear previous contents

                // move originals into hidden holder to preserve handlers
                if (coverBtn) hidden.appendChild(coverBtn)
                if (actions) hidden.appendChild(actions)

                const coverSrc = coverImg?.src || null
                const titleText = title ? title.textContent || null : null
                const subtitleText = subtitle ? subtitle.textContent || null : null

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

                main.dataset.crxHidden = '1'

                // send props to our local SidebarReplace instance
                const props = { coverSrc, titleText, subtitleText, actions: actionItems }
                updateSidebarProps(props)
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

    /* useEffect(() => {
        if (!mainNode) return
        console.log('[CRXJS] Running sidebar replacement with props', sidebarProps)

        const main = mainNode // for easier reference

        while (main.firstChild) main.removeChild(main.firstChild)
        const host = document.createElement('div')
        main.appendChild(host)

        const root = createRoot(host)
        root.render(
            <StrictMode>
                <SidebarReplacement {...sidebarProps} />
            </StrictMode>
        )
        console.log('[CRXJS] Sidebar content replaced (React)')
    }, [mainNode, sidebarProps, cities]) */

    useEffect(() => {
        const obs = new MutationObserver(() => {
            const main = document.querySelector('[role="main"]')
            const foundGoogleSidebarWrapper =
                main?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement
                    ?.parentElement

            if (
                !!foundGoogleSidebarWrapper &&
                (foundGoogleSidebarWrapper !== googleSidebarWrapper ||
                    getComputedStyle(foundGoogleSidebarWrapper) !==
                        getComputedStyle(googleSidebarWrapper))
            ) {
                setGoogleSidebarWrapper(foundGoogleSidebarWrapper)

                const styles = getComputedStyle(foundGoogleSidebarWrapper)
                setCurrentWidth(styles.width)
                setCurrentTransform(styles.transform)
                setCurrentTransition(styles.transition)
            }
        })
        obs.observe(document.body, { childList: true, subtree: true, attributes: true })
        return () => obs.disconnect()
    }, [])

    /*  useEffect(() => {
        if (!googleSidebarWrapper) return

        const styles = getComputedStyle(googleSidebarWrapper)
        setCurrentWidth(styles.width)
        setCurrentTransform(styles.transform)
        console.log('[CRXJS] Detected Google sidebar wrapper with styles', {
            styles,
            width: styles.width,
            transform: styles.transform,
        })
    }, [googleSidebarWrapper]) */

    useEffect(() => {
        console.log('[CRXJS] Sidebar props updated', sidebarProps)
    }, [sidebarProps])

    return (
        <div
            id='crx-sidebar-manager'
            style={{
                width: currentWidth,
                transform: currentTransform,
                transition: currentTransition,
            }}
        >
            {children}
        </div>
    )
}
