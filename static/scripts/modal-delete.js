const deleteModal = document.getElementById('modal-delete')

/**
 * Displays the delete confirmation modal for staff and handles book deletion.
 * 
 * Features:
 * - Shows book details in modal preview
 * - Submits delete request via AJAX using fetch API
 * - Handles redirection on success (usually to library)
 * 
 * Error Handling:
 * - Handles reload and validation errors
 * - Distinguishes between modal-related and backend/log-only/fetch errors
 * - Displays modal error messages by editing the modal directly
 * 
 * @param {Object} book - Book to delete containing details such as title, ISBN, cover.
 */
function deleteBook(book) {
    const modalError = deleteModal.querySelector('.modal-error')
    // Show modal and clear previous errors
    deleteModal.classList.add('show')
    modalError.classList.remove('show')
    modalError.textContent = ''

    // Set book details in modal preview
    deleteModal.querySelector('.modal-preview img').src = `/media/${book.cover}`
    deleteModal.querySelector('.modal-preview-title').textContent = book.title

    // Handle delete confirmation logic
    document.getElementById('modal-delete-form').addEventListener('submit', async function(e) {
        e.preventDefault()  
    
        const form = e.target
    
        const csrfToken = deleteModal.querySelector('[name=csrfmiddlewaretoken]').value
        try {
            const response = await fetch(`/api/admin/delete-book/?isbn=${book.ISBN}`, {
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
                // Redirects to other page (usually the library page after successful deletion)
                window.location.href = data.redirect
            } else if (data.log_error) {
                modalError.textContent = 'An error has occurred!'
                modalError.classList.add('show')
                console.error(data.log_error)
            } else if (data.modal_error) {
                modalError.textContent = data.modal_error
                modalError.classList.add('show')
            } else {
                // Reload window for other issue
                window.location.reload()
            }
        } catch (error) {
            modalError.textContent = 'An error has occurred!'
            modalError.classList.add('show')
            console.error('Fetch error:', error.error || error.message || error)
        }
    })
}