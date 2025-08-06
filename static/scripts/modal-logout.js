/**
 * Dusokays the logout confirmation modal for authenticated users and handles the logout process.
 * 
 * Features:
 * - Displays message in modal for logout confirmation
 * - Submits logout request via AJAX using fetch API
 * - Reloads the page on successful logout
 * 
 * Error Handling:
 * - Distinguishes between modal-related and backend/log-only/fetch errors
 * - Displays modal error messages by editing the modal directly
 */

const logoutBtn = document.getElementById('button-logout')
const logoutModal = document.getElementById('modal-logout')
const logoutErr = logoutModal.querySelector('.modal-error')

// Show modal and clear previous errors on logout button click
logoutBtn.onclick = () => {
    logoutModal.classList.add('show')
    logoutErr.classList.remove('show')
    logoutErr.textContent = ''
}

// Handle logout confirmation logic
document.getElementById('modal-logout-form').addEventListener('submit', async function(e) {
    e.preventDefault()

    const form = e.target

    const csrfToken = logoutModal.querySelector('[name=csrfmiddlewaretoken]').value
    try {
        const response = await fetch(`/api/logout/`, {
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

        if (data.log_error) {
            logoutErr.textContent = 'An error has occurred!'
            logoutErr.classList.add('show')
            console.error(data.log_error)
        } else if (data.modal_error) {
            logoutErr.textContent = data.modal_error
            logoutErr.classList.add('show')
        } else {
            window.location.reload()
        }
    } catch (error) {
        logoutErr.textContent = 'An error has occurred!'
        logoutErr.classList.add('show')
        console.error('Fetch error:', error.error || error.message || error)
    }
})