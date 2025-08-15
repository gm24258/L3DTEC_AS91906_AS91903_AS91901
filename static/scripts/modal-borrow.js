const borrowModal = document.getElementById('modal-borrow')

/**
 * Displays the borrow confirmation modal for authenticated users and handles book borrowing.
 * 
 * Features:
 * - Shows book details and expected cooldown/due dates in modal preview
 * - Submits borrow request via AJAX using fetch API
 * - Reloads page on successful borrow to update UI
 * 
 * Error Handling:
 * - Handles login redirection and validation errors
 * - Distinguishes between modal-related and backend/log-only/fetch errors
 * - Displays modal error messages by editing the modal directly
 * 
 * @param {Object} book - Book to borrow containing details such as title, ISBN, cover.
 */
function borrowBook(book) {
    const modalError = borrowModal.querySelector('.modal-error')
    // Show modal and clear previous errors
    borrowModal.classList.add('show')
    modalError.classList.remove('show')
    modalError.textContent = ''

    // Set cooldown and due dates
    const todayDate = new Date()
    const cooldownDate = new Date()
    cooldownDate.setDate(todayDate.getDate() + 1)
    const dueDate = new Date()
    dueDate.setDate(todayDate.getDate() + 14)

    // Display book details and dates in modal
    borrowModal.querySelector('.modal-preview img').src = `/media/${book.cover}`
    borrowModal.querySelector('.modal-preview-title').textContent = book.title
    borrowModal.querySelector('.modal-caption .date.due').textContent = formatDate(dueDate)

    // Handle borrow confirmation logic
    document.getElementById('modal-borrow-form').addEventListener('submit', async function(e) {
        const button = document.getElementById('modal-borrow-form').querySelector('.modal-submit')
        button.disabled = true

        e.preventDefault()  
    
        const form = e.target
    
        const csrfToken = borrowModal.querySelector('[name=csrfmiddlewaretoken]').value
        try {
            const response = await fetch(`/api/borrow-book/?isbn=${book.ISBN}`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new FormData(form)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw errorData
            }

            const data = await response.json()

            if (data.redirect) {
                // Redirects to another page (usually the login page if a user isn't authenticated)
                window.location.href = data.redirect
            } else if (data.log_error) {
                modalError.textContent = 'An error has occurred!'
                modalError.classList.add('show')
                console.error(data.log_error)
            } else if (data.modal_error) {
                modalError.textContent = data.modal_error
                modalError.classList.add('show')
            } else {
                // Successful borrow — reload page
               window.location.reload()
            }
        } catch (error) {
            modalError.textContent = 'An error has occurred!'
            modalError.classList.add('show')
            console.error('Fetch error:', error.error || error.message || error)
        } finally {
            button.disabled = false
        }
    })
}