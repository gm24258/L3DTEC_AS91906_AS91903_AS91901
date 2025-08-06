/**
 * Sets up modal closing behavior:
 * - Closes modal when the close button is clicked.
 * - Closes modal when clicking outside modal content (on the backdrop).
 * - Clears any visible error messages within the modal.
 */

const modals = document.querySelectorAll('.modal')
const closeBtns = document.querySelectorAll('.modal .close')

// Handle clicks on modal close buttons
closeBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
        const modal = modals[index]
        const elError = modal.querySelector('.modal-error')

        modal.classList.remove('show')
        elError.classList.remove('show')
        elError.textContent = ''
    })
})

// Handle clicks on the modal backdrop (outside content area)
window.addEventListener('click', (event) => {
    modals.forEach(modal => {
        if (event.target === modal) {
            const elError = modal.querySelector('.modal-error')

            modal.classList.remove('show')
            elError.classList.remove('show')
            elError.textContent = ''
        }
    })
})