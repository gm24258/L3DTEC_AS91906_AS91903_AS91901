/**
 * Handles filter and search input interactions, updates search state,
 * triggers queries, manages browser history, and UI states.
 *
 * Features:
 * - Tracks filter changes and reflects selections visually.
 * - Supports multi-select and single-select filters.
 * - Provides "Clear Filter" functionality.
 * - Activates search input behavior with history state syncing.
 * - Closes search results on outside clicks.
 * - Observes search container active state for UI/UX enhancements.
 * 
 * Dependencies:
 * - Requires default filters for sorting and genres to be set in the template context (from the HTML page template that has the search bar).
 */

//* FILTER
const clearFilterBtn = searchWrapper.querySelector('.search-filter-clear')
const filterMenu = searchWrapper.querySelector('.dropdown-menu.filter')
const filterItems = document.querySelectorAll('.dropdown-column.filter .dropdown-item')

function arraysEqual(a, b) {
    if (a.length !== b.length) return false
    return a.every((v) => b.includes(v))
}

function filterChanged() {
    // Determine if all filters are default
    const isDefault = Object.entries(defaultFilter).every(([key, defaultValue]) => {
        const currentValue = searchFilter[key]
        return Array.isArray(defaultValue)
            ? arraysEqual(currentValue, defaultValue)
            : currentValue === defaultValue
    })

    // Highlight selected filter items
    filterItems.forEach(item => {
        const name = item.dataset.filter_value
        const matched = Object.entries(searchFilter).some(([key, value]) =>
            Array.isArray(value) ? value.includes(name) : value === name
        )
        item.classList.toggle('checked', matched)
    })

    // Show or hide the "Clear Filter" button
    clearFilterBtn.classList.toggle('show', !isDefault)
    searchQuery(searchBar.value, searchContainer.classList.contains('active'))
}

clearFilterBtn.addEventListener('click', (e) => {
    Object.entries(defaultFilter).forEach(([key, defaultValue]) => {
        const param = params.get(key)

        searchFilter[key] = Array.isArray(defaultValue)
            ? (param ? param.split(',').filter(v => v) : [...defaultValue])
            : (param ?? defaultValue)
    })
    filterChanged()
})

filterItems.forEach(item => {
    const parentContainer = item.parentElement
    const key = parentContainer.dataset.filter_name
    const value = item.dataset.filter_value
    const isMultiple = parentContainer.classList.contains('multiple')

    item.addEventListener('click', (e) => {
        e.stopPropagation()
        // Multi-choice
        if (isMultiple) {
            if (searchFilter[key].includes(value)) {
                const index = searchFilter[key].indexOf(value)
                searchFilter[key].splice(index, 1)
            } else {
                searchFilter[key].push(value)
            }
            // Single choice
        } else {
            searchFilter[key] = value
        }
        filterChanged()
    })
})
//* FILTER END

//* SEARCH
let oldSearch = ''

// Search bar focused
searchBar.addEventListener('focusin', () => {
    if (!searchContainer.classList.contains('active')) {
        searchContainer.classList.add('active')
        if (oldSearch) {
            searchBar.value = oldSearch
        }
        searchQuery(searchBar.value, true)
    }
})

// Lost focus on search bar/filter menu
document.addEventListener('mousedown', (e) => {
    const clickedOutside =
        !searchWrapper.contains(e.target) &&
        !Array.from(queryContainer.querySelectorAll('.query-item')).some(item => item.contains(e.target))
    const filterIsOpen = filterMenu?.classList.contains('show')

    if (clickedOutside && !filterIsOpen && searchContainer.classList.contains('active')) {
        oldSearch = searchBar.value
        searchContainer.classList.remove('active')
        searchBar.value = ''
        searchQuery('', false)
    }
})

// Typed in search bar
searchBar.addEventListener('input', () => {
    searchQuery(searchBar.value, true)
})

const params = new URLSearchParams(window.location.search)

Object.entries(defaultFilter).forEach(([key, defaultValue]) => {
    const param = params.get(key)

    searchFilter[key] = Array.isArray(defaultValue)
        ? (param ? param.split(',').filter(v => v) : [...defaultValue])
        : (param ?? defaultValue)
})

if (params.has('q')) {
    searchContainer.classList.add('active')
    oldSearch = params.get('q')
    searchBar.value = params.get('q')
}
filterChanged()

// When the user changes history
window.addEventListener('popstate', () => {
    window.popStateEvent = true
    const newParams = new URLSearchParams(window.location.search)
    if (newParams.has('q')) {
        searchContainer.classList.add('active')
        oldSearch = newParams.get('q')
        searchBar.value = newParams.get('q')
    } else {
        searchContainer.classList.remove('active')
        searchBar.value = newParams.get('q')
    }
    newParams.forEach((value, key) => {
        if (key === 'q') return // Already handled above
        if (searchFilter.hasOwnProperty(key)) {
            // If the searchFilter key expects an array (like genres), convert comma-separated values
            const defaultValue = defaultFilter[key]
            if (Array.isArray(defaultValue)) {
                // Automatically set array in searchFilter (e.g. genres) to the values based on the param, or empty array if param is empty
                searchFilter[key] = value ? value.split(',').filter(v => v) : []
            } else {
                searchFilter[key] = value
            }
        }
    })
    filterChanged()
    window.popStateEvent = false
})

// Checks if search bar class "active" changes
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
            const hasActive = mutation.target.classList.contains('active')
            document.body.classList.toggle('active', hasActive)
            if (hasActive) {
                // Scroll to top on search bar activation
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                })
            }
        }
    })
})

observer.observe(searchContainer, { attributes: true })