/**
 * Handles book search queries and filter rendering dynamically.
 * 
 * Features:
 * - Fetches and displays books based on user input and selected filters.
 * - Updates browser URL and history for back/forward navigation.
 * - Shows "Add a book" shortcut for staff users when search input is empty.
 * - Renders interactive dropdown filters with single and multi-select options.
 * 
 * Error Handling:
 * - Displays empty state message when no books match the search.
 * - Logs network and fetch errors to the console.
 * 
 * Dependencies:
 * - Requires a global `genres` array for genre filter options (from library.html).
 * - Requires existing HTML templates for query items and filter dropdown UI.
 */

// Global state to hold the current search filters (sort, genres)
const searchFilter = {}

// DOM references for key elements involved in the search UI
const currentPath = window.location.pathname
const searchBar = document.getElementById('search')
const searchWrapper = searchBar.parentElement.parentElement
const searchContainer = searchWrapper.parentElement
const queryContainer = searchContainer.querySelector('.query-container')
const queryItem = document.getElementById('query-item-template')

/**
 * Executes a book search query, updates the URL, fetches results from API,
 * and renders the results or appropriate messages in the DOM.
 * 
 * @param {string} query - The user's search input string (optional).
 * @param {boolean} active - Whether to update the browser history (default true).
 */
function searchQuery(query = '', active = true) {
    query = query.trim()
    // Construct query parameters string for API request
    const params = `q=${query}&sort=${searchFilter.sort}&genres=${encodeURIComponent(searchFilter.genres)}`
    const url = `${currentPath}?${params}`
    // Update browser URL and history state if active
    if (!window.popStateEvent) {
        if (active) {
            history.pushState({ path: url }, '', url)
        } else {
            history.pushState(null, '', currentPath)
        }
    }
    
    // Fetch matching books from backend API (contacts view.py)
    fetch(`/api/search-books/?${params}`, {
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
            emptyText.textContent = data.books.length > 0 ? '' : 'Nothing to display here.'

            // For staff users, show "Add a book" shortcut when search bar input is empty
            const isStaff = data.is_staff
            const emptySearchBar = searchBar.value.trim() == ''
            if (isStaff && emptySearchBar) {
                const clone = queryItem.content.cloneNode(true)
                const item = clone.querySelector('.query-item')
                item.href = `/admin/Application/book/add`
                item.target = '_blank'
                // Replace book cover image with a plus icon div
                const plus = document.createElement('div')
                plus.id = 'a__plus'
                clone.querySelector('img').replaceWith(plus)
                // Remove author and ISBN elements for this shortcut
                clone.querySelector('.book-author').remove()
                clone.querySelector('.book-isbn').remove()
                // Update the label to "Add a book"
                const label = clone.querySelector('.book-title')
                label.className = ''
                label.id = 'a__add'
                label.textContent = 'Add a book'
                queryContainer.appendChild(clone)
                emptyText.remove()
                queryContainer.appendChild(emptyText)
            }

            // Render each book result into the DOM
            data.books.forEach(book => {
                const clone = queryItem.content.cloneNode(true)
                const book_cover = clone.querySelector('img')
                book_cover.src = `/media/${book.cover}`
                book_cover.alt = `"${book.title}" book cover`
                book_cover.setAttribute('draggable', false)
                clone.querySelector('.query-item').href = `/library/book/${book.ISBN}/`
                clone.querySelector('.book-title').textContent = book.title 
                clone.querySelector('.book-author').textContent = `by ${book.author}`
                clone.querySelector('.book-isbn').textContent = `ISBN: ${book.ISBN}`
                queryContainer.appendChild(clone)
            })
        })
        .catch(error => {
            console.error('Fetch error:', error.error || error.message || error)
        })
}

/**
 * Initializes filter dropdown UI elements for sorting and genres.
 * Uses a predefined `genres` array (should be set in the template context).
 */

// DOM references and templates for filters
const filterContainer = searchWrapper.querySelector('.dropdown-content.filter')
const filterColumnTemplate = document.getElementById('filter-dropdown-column-template')
const filterItemTemplate = document.getElementById('filter-dropdown-item-template')

// Define filter categories and their options
const filterColumns = {
    'Sort': ['Popular', 'Latest', 'Oldest'],
    'Genres': []
} 
// Define if filters allow multiple selections
const filterMulti = {
    'Sort': false,
    'Genres': true
}

// Populate genre filter options from predefined `genres`
genres.forEach(genre => {
    filterColumns.Genres.push(genre.name)
})

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