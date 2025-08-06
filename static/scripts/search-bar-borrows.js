/**
 * Handles record search queries and filter rendering dynamically.
 * 
 * Features:
 * - Fetches and displays user borrow records based on search input and selected sort filters.
 * - Updates browser URL and history for navigation support.
 * - Renders interactive dropdown filter for sorting options.
 * - Smoothly scrolls to selected record in the borrow list when clicked.
 * 
 * Error Handling:
 * - Displays empty state message when no records match the search.
 * - Logs network and fetch errors to the console.
 * 
 * Dependencies:
 * - Requires existing HTML templates for query items and filter dropdown UI.
 */

// Global state to hold the current search filters (sort)
const searchFilter = {}

// DOM references for key elements involved in the search UI
const currentPath = window.location.pathname
const searchBar = document.getElementById('search')
const searchWrapper = searchBar.parentElement.parentElement
const searchContainer = searchWrapper.parentElement
const queryContainer = searchContainer.querySelector('.query-container')
const queryItem = document.getElementById('query-item-template')

/**
 * Fetches and renders record search results based on query and sort filters.
 *
 * @param {string} query - The user's search input (optional).
 * @param {boolean} active - Whether to push state to browser history (default true).
 */
function searchQuery(query = '', active = true) {
    query = query.trim()
    // Construct query parameters string for API request
    const params = `q=${query}&sort=${searchFilter.sort}`
    const url = `${currentPath}?${params}`
    // Update browser URL and history state if active
    if (!window.popStateEvent) {
        if (active) {
            history.pushState({ path: url }, '', url)
        } else {
            history.pushState(null, '', currentPath)
        }
    }
    
    // Fetch matching records from backend API (contacts view.py)
    fetch(`/api/search-records/?${params}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest'}
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            return response.json()
        })
        .then(data => {
            const emptyText = queryContainer.querySelector('.empty-text')
            // Clear previous results but keep the "empty-text" element
            queryContainer.innerHTML = ''
            queryContainer.appendChild(emptyText)

            // Show empty message if no book results
            emptyText.textContent = data.length > 0 ? '' : 'Nothing to display here.'

            // Render each record result into the DOM
            data.forEach(record => {
                const clone = queryItem.content.cloneNode(true)
                // Applying details of book from record
                const book_cover = clone.querySelector('img')
                book_cover.src = `/media/${record.book__cover}`
                book_cover.alt = `"${record.book__title}" book cover`
                book_cover.setAttribute('draggable', false)
                clone.querySelector('.book-title').textContent = record.book__title 
                clone.querySelector('.book-author').textContent = `by ${record.book__author}`
                const isbnField = clone.querySelector('.book-isbn')
                isbnField.textContent = `ISBN: ${record.book__ISBN}`
                // Additional record id field (Django's ID system)
                const record_id = isbnField.cloneNode(true)
                record_id.className = 'record-id id'
                record_id.textContent = `Record Id: ${record.id}`
                clone.querySelector('.query-item-details').appendChild(record_id)

                // Scroll to the target record in the borrows page item when clicked
                clone.querySelector('.query-item').addEventListener('click', () => {
                    searchContainer.classList.remove('active')
                    searchBar.value = ''
                    searchQuery('', active = false)
                    const target = document.getElementById(`record_${record.id}`)
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                })

                queryContainer.appendChild(clone)
            })
        })
        .catch(error => {
            console.error('Fetch error:', error.error || error.message || error)
        })
}

/**
 * Initializes filter dropdown UI elements for sorting.
 */

// DOM references and templates for filters
const filterContainer = searchWrapper.querySelector('.dropdown-content.filter')
const filterColumnTemplate = document.getElementById('filter-dropdown-column-template')
const filterItemTemplate = document.getElementById('filter-dropdown-item-template')

// Define filter categories and their options
const filterColumns = {
    'Sort': ['Latest', 'Oldest']
} 
// Define if filters allow multiple selections
const filterMulti = {
    'Sort': false
}

// Render filter columns and options into dropdown container
Object.entries(filterColumns).forEach(([title, column]) => {
    const cloneColumn = filterColumnTemplate.content.cloneNode(true)
    const columnContainer = cloneColumn.querySelector('.dropdown-column')
    columnContainer.dataset.filter_name = title.toLowerCase()
    
    // Enable multiple selection UI for applicable filters
    if (filterMulti[title]) {
        columnContainer.classList.add('multiple')
    }
    
    // Set column header title
    const titleEl = cloneColumn.querySelector('.column-title')
    titleEl.textContent = title

    // Add each filter option as an item
    column.forEach(name => {
        const cloneItem = filterItemTemplate.content.cloneNode(true)
        const itemContainer = cloneItem.querySelector('.dropdown-item')
        itemContainer.dataset.filter_value = name.toLowerCase()
        itemContainer.textContent = name

        columnContainer.appendChild(cloneItem)
    })

    filterContainer.appendChild(cloneColumn)
})