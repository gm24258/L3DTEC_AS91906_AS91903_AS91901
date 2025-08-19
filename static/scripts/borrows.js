/**
 * Handles initialization and rendering of a user's borrow records (mainly for borrows.html).
 * 
 * Features:
 * - Fetches borrow data for the current user.
 * - Renders each record with book info and relevant timestamps.
 * - Shows return cooldown countdown (24-hour wait).
 * - Displays due date countdown and overdue status.
 * - Enables book return via interactive button.
 * 
 * Error Handling:
 * - Displays fallback message if no records exist.
 * - Handles fetch or network errors gracefully.
 */

const borrowsContainer = document.querySelector('.container.borrows')
const borrowItemTemplate = document.getElementById('borrows-container-item-template')

function initializeBorrows() {
    // Fetch borrow records JSON for the current user from the API endpoint (contacts view.py)
    fetch(`/api/get-records-data/?user_id=${djangoUser}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest'}
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            return response.json()
        })
        .then(data => {
            const emptyText = borrowsContainer.querySelector('.empty-text')
            
            // Show empty message if no records found
            emptyText.textContent = data.length > 0 ? '' : 'Nothing to display here.'

            // Render each borrow record result into the DOM
            data.forEach(record => {
                const clone = borrowItemTemplate.content.cloneNode(true)
                clone.querySelector('.container-item.borrows').id = `record_${record.id}`

                //* BOOK DETAILS
                // Set link, cover image, title, author, ISBN, record ID
                clone.querySelector('.container-item-link.borrows').href = `/library/book/${record.book__ISBN}/`
                clone.querySelector('.container-item-img.borrows').src = `media/${record.book__cover}`
                clone.querySelector('.book-title').textContent = record.book__title
                clone.querySelector('.book-author').textContent = `by ${record.book__author}`
                clone.querySelector('.book-isbn').textContent = `ISBN: ${record.book__ISBN}`
                clone.querySelector('.record-id').textContent = `Record Id: ${record.id}`

                // Format and display borrow and due dates
                const borrowDate = new Date(record.borrow_date)
                clone.querySelector('.book-borrow-date').textContent = `Borrowed on: ${formatDate(borrowDate)}`
                const dueDate = new Date(record.due_date)
                clone.querySelector('.book-due-date').textContent = `Due on: ${formatDate(dueDate)}`
                const returnDateEl = clone.querySelector('.book-return-date')

                //* OPTIONS
                const returnBtn = clone.querySelector('.container-option.borrows.return')
                const returnTooltip = returnBtn.parentElement.querySelector('.option-tooltip.borrows')
                const timeBtn = clone.querySelector('.container-option.borrows.clock')
                const timeTooltip = timeBtn.parentElement.querySelector('.option-tooltip.borrows')

                if (record.return_date) {
                    // If already returned, remove return button and show return date
                    returnBtn.parentElement.remove()
                    returnDateEl.textContent = `Returned on: ${formatDate(new Date(record.return_date))}`
                    
                    // Style clock button based on whether book was returned overdue
                   if (record.due_date < record.return_date) {
                        timeBtn.classList.add('critical')
                        timeTooltip.textContent = 'Returned overdue'
                    } else {
                        timeBtn.classList.add('done')
                        timeTooltip.textContent = 'Returned'
                    }
                } else {
                    // If not returned yet, remove return date element (not applicable)
                    returnDateEl.remove()

                    //* RETURN BUTTON HANDLER
                    returnBtn.onclick = () => {
                        const recordData = {
                            due_date: formatDate(new Date(record.due_date)),
                            book__ISBN: record.book__ISBN,
                            book__title: record.book__title,
                            book__cover: record.book__cover
                        }
                        returnBook(recordData)
                    }
                }
                
                // Append the populated borrow item to the container
                borrowsContainer.appendChild(clone)
            })
        })
        .catch(error => {
            console.error('Fetch error:', error.error || error.message || error)
        })
}

// Initialize borrows of user if they exist
if (djangoUser) {
    initializeBorrows()
}