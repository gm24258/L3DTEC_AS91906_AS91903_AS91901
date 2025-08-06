/**
 * Handles user login via asynchronous request.
 * 
 * Features:
 * - Submits login form using AJAX (fetch API)
 * - Sends CSRF token and form data via POST
 * - Redirects to the provided URL on successful login
 * - Displays field-specific error messages on failure
 * - Supports "__all__" errors for general validation issues
 * 
 * Error Handling:
 * - Clears all previous error messages before showing new ones
 * - Triggers animation for re-shown error labels
 */

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault() // Stop default form submission

    const form = e.target
    const fData = new FormData(form) // Gather form data

    // Get CSRF token from hidden input
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value
    // Send AJAX POST request to login endpoint
    const response = await fetch(form.action || window.location.href, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: fData,
    })

    // Parse JSON response
    const data = await response.json()

    // Clear all existing error messages
    document.querySelectorAll('.error').forEach(el => {
        el.classList.remove('show')
        el.innerText = ''
    })

    if (data.success) {
        // Redirect on successful login
        window.location.href = data.redirect_url
    } else if (data.errors) {
        // Display validation errors for each field
        for (const [field, msg] of Object.entries(data.errors)) {
            var el = document.getElementById(`error-${field}`)
            // Use '__all__' fallback to bottom field (password) error display
            if (field == '__all__') {
                el = document.getElementById('error-password')
            }
            if (el) {
                el.innerText = msg
                void el.offsetWidth // Force reflow to restart animation
                el.classList.add('show') // Show the error
            }
        }
    }
})