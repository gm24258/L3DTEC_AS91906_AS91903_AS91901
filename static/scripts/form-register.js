/**
 * Handles user registration via asynchronous request.
 * 
 * Features:
 * - Submits registration form using AJAX (fetch API)
 * - Sends CSRF token and form data via POST
 * - Redirects to the provided URL on successful registration
 * - Displays field-specific error messages on validation issues
 * 
 * Error Handling:
 * - Clears all previous error messages before showing new ones
 * - Triggers animation for re-shown error labels
 */


document.getElementById('register-form').addEventListener('submit', async function (e) {
    e.preventDefault() // Stop default form submission

    const form = e.target
    const fData = new FormData(form) // Gather form data

    // Get CSRF token from hidden input
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value
    // Send AJAX POST request to register endpoint
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
        // Redirect on successful register
        window.location.href = data.redirect_url
    } else if (data.errors) {
        // Display validation errors for each field
        for (const [field, msg] of Object.entries(data.errors)) {
            const el = document.getElementById(`error-${field}`)
            if (el) {
                el.innerText = msg
                void el.offsetWidth // Force reflow to restart animation
                el.classList.add('show') // Show the error
            }
        }
    }
})