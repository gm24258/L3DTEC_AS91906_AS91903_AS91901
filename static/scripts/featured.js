/**
 * Dynamically loads and renders featured book sections based on page context.
 * 
 * Features:
 * - Fetches section data (popular, latest, or custom) from backend API.
 * - Renders up to 7 books per section using HTML templates.
 * - Supports genre-specific sections for genre pages.
 * - Displays fallback message when no books are present.
 * 
 * Requirements:
 * - A global `window.featuredParams` object with:
 *   - `page`: Page type ('home', 'library', or 'genre')
 *   - `genre`: (Optional) Genre name, required if page is 'genre'
 * 
 * Error Handling:
 * - Logs errors if page type is missing or fetch fails.
 */

const featuredContainer = document.querySelector('.container.featured')
const featuredSection = document.getElementById('featured-container-section-template')
const featuredItem = document.getElementById('featured-container-item-template')

function initializeFeatured() {
    const pageType = window.featuredParams.page
    if (!pageType) {
        console.error("Missing required parameter: page")
        return
    }

    // Construct query parameters for the API call
    const params = `page=${pageType}` + (pageType == 'genre' ? `&genre=${window.featuredParams.genre}` : "")
    
    // Fetch featured data from API endpoint (contacts view.py)
    fetch(`/api/get-featured-data/?${params}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest'}
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {throw err})
            }
            return response.json()
        })
        .then(data => {
            data.forEach(featured => {
                // Clone the section template for each featured section
                const clonedSection = featuredSection.content.cloneNode(true)
                // Set the section title
                const header = clonedSection.querySelector('h1')
                header.textContent = featured.title
                // Reference the container for featured items (books)
                const containerRow = clonedSection.querySelector('.container-row.featured')
                
                // Show empty message if no books found in section
                containerRow.textContent = featured.books.length > 0 ? '' : 'Nothing to display here.'
                
                // Render each book from the featured section into the DOM
                featured.books.forEach(book => {
                    // Set link to the book detail page
                    const clonedItem = featuredItem.content.cloneNode(true)
                    const itemAnchor = clonedItem.querySelector('.container-item.featured')
                    itemAnchor.href = `/library/book/${book.ISBN}/`
                    // Set the book cover image source
                    const bookCover = clonedItem.querySelector('img')
                    bookCover.src = `/media/${book.cover}`
                    // Append the book item to the container row
                    containerRow.appendChild(clonedItem)
                })

                // Append the fully populated section to the main featured container
                featuredContainer.appendChild(clonedSection)
            })
        })
        .catch(error => {
            console.error('Fetch error:', error.error || error.message || error)
        })
}

// Initialize featured sections if parameters are set globally
if (window.featuredParams) {
    initializeFeatured()
}