export let cities = {}

export function updateCities(newCity) {
    if (!newCity || !newCity.name) return

    const name = newCity.name

    if (!(name in cities)) {
        cities[name] = { ...newCity }
        if (!('buildings' in cities[name])) {
            cities[name].buildings = {}
        }
    }
}

export function addBuildingToCity(cityName, building) {
    if (!cityName || !building) return

    updateCities({ name: cityName }) // Ensure city exists

    const city = cities[cityName]
    if (!city) return

    if (!building.name) return

    if (building.name in city.buildings && building.level) {
        city.buildings[building.name].level =
            building.level + (city.buildings[building.name].level || 0)
        return
    }

    city.buildings[building.name] = building
}
