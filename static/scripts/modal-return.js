const returnModal = document.getElementById('modal-return')

/**
 * Displays the return confirmation modal for authenticated users and handles book returning.
 * 
 * Features:
 * - Shows book details and today/record's due date in modal preview
 * - Submits return request via AJAX using fetch API
 * - Reloads page on successful return to update UI
 * 
 * Error Handling:
 * - Handles login redirection and validation errors
 * - Distinguishes between modal-related and backend/log-only/fetch errors
 * - Displays modal error messages by editing the modal directly
 * 
 * @param {Object} record - Borrow record containing book details and due date.
 */
function returnBook(record) {
    const modalError = returnModal.querySelector('.modal-error')
    // Show modal and clear previous errors
    returnModal.classList.add('show')
    modalError.classList.remove('show')
    modalError.textContent = ''

    const todayDate = new Date()

    // Display book details and dates in modal
    returnModal.querySelector('.modal-preview img').src = `/media/${record.book__cover}`
    returnModal.querySelector('.modal-preview-title').textContent = record.book__title
    returnModal.querySelector('.modal-caption .date.due').textContent = record.due_date 
    returnModal.querySelector('.modal-caption .date.today').textContent = formatDate(todayDate)

    // Handle return confirmation logic
    document.getElementById('modal-return-form').addEventListener('submit', async function(e) {
        const button = document.getElementById('modal-return-form').querySelector('.modal-submit')
        button.disabled = true

        e.preventDefault()  
    
        const form = e.target
    
        const csrfToken = returnModal.querySelector('[name=csrfmiddlewaretoken]').value
        try {
            const response = await fetch(`/api/return-book/?isbn=${record.book__ISBN}`, {
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
                // Successful return — reload page
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