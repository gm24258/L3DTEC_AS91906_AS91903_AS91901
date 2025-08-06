/**
 * Controls behavior of dropdown menus throughout the site.
 * 
 * Features:
 * - Toggles visibility of menus on click.
 * - Ensures only one dropdown is open at a time.
 * - Prevents internal clicks from closing the dropdown.
 * - Dynamically adjusts z-index for proper navbar layering.
 * - Closes all open dropdowns when clicking outside.
 * 
 * Error Handling:
 * - Fails silently on transition/z-index logic to avoid UI breakage.
 */


const dropdownMenus = document.querySelectorAll('.dropdown-menu')

dropdownMenus.forEach(menu => {
    // Select the inner dropdown content to prevent it from toggling the dropdown itself
    content = menu.querySelector('.dropdown-content')
    
    // Prevent clicks inside dropdown content from propagating and closing the menu
    content.addEventListener('click', (e) => { e.stopPropagation()})

    // Toggle the dropdown menu visibility when its button/container is clicked
    menu.addEventListener('click', () => {
        menu.classList.toggle('show')
    })

    // Close all other dropdowns
    dropdownMenus.forEach(otherMenu => {
        if (otherMenu !== menu) {
            otherMenu.classList.remove('show')
            if (otherMenu.classList.contains('nav-item')) {
                otherMenu.style.zIndex = '9997'
            }
        }
    })
    
    // Adjust z-index after CSS transition ends for navbar menus
    menu.addEventListener('transitionend', () => {
        const menuOpen = menu?.classList.contains('show')
        const isNav = menu?.classList.contains('nav-item')
        if (isNav) {
            if (menuOpen) {
                menu.style.zIndex = 9996
            } else {
                menu.style.zIndex = 9997
            }
        }
    })
})

// Close all dropdown menus if user clicks anywhere outside them
window.addEventListener('click', (e) => {
    dropdownMenus.forEach(menu => {
        if (!menu.contains(e.target)) {
            menu.classList.remove('show')
        }
    })
})