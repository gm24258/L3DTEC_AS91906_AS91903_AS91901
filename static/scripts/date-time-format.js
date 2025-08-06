/**
 * Format a millisecond duration into a human-readable string.
 * Shows up to 3 largest non-zero time units: days, hours, minutes, seconds.
 * Examples: "1d 3h 15m", "4h 12m 30s", "0s" if duration is zero.
 * @param {number} ms - Duration in milliseconds.
 * @returns {string} Formatted time left string.
 */
function formatTimeLeft(ms) {
    const units = [
        { label: 'd', value: Math.floor(ms / (1000 * 60 * 60 * 24)) }, // days
        { label: 'h', value: Math.floor(ms / (1000 * 60 * 60)) % 24 }, // hours (mod 24)
        { label: 'm', value: Math.floor(ms / (1000 * 60)) % 60 },      // minutes (mod 60)
        { label: 's', value: Math.floor(ms / 1000) % 60 }              // seconds (mod 60)
    ]

    // Remove units with zero value
    const nonZeroUnits = units.filter(u => u.value > 0)

    // If all zero, fallback to "0s"
    if (nonZeroUnits.length === 0) return '0s'

    // Return string with up to 3 largest non-zero units
    return nonZeroUnits.slice(0, 3).map(u => `${u.value}${u.label}`).join(' ')
}

/**
 * Format a Date object into a readable string for NZ locale.
 * Example: "Sat 21 Jun, 2025, 5:24 p.m."
 * @param {Date} date - The Date object to format.
 * @returns {string} Formatted date string.
 */
function formatDate(date) {
    const options = {
        weekday: 'short', // e.g. "Sat"
        day: '2-digit',   // e.g. "21"
        month: 'short',   // e.g. "Jun"
        year: 'numeric',  // e.g. "2025"
        hour: 'numeric',  // e.g. "5"
        minute: '2-digit',// e.g. "24"
        hour12: true      // am/pm format
    }

    // Format the date to locale string
    let formattedDate = date.toLocaleString('en-NZ', options)

     // Clean up commas from date parts
    const parts = formattedDate.split(' ')
    const weekday = parts[0].replace(',', '')
    const day = parts[1].replace(',', '')   // Remove comma from day
    const month = parts[2].replace(',', '') // Remove comma from month
    const year = parts[3].replace(',', '')  // Remove comma from year
    let time = parts[4]
    let ampm = parts[5].toLowerCase()      // "pm" or "am"

    // Convert am/pm to "a.m." or "p.m."
    if (ampm === 'am') {
        ampm = 'a.m.'
    } else if (ampm === 'pm') {
        ampm = 'p.m.'
    }

    return `${weekday} ${day} ${month}, ${year}, ${time} ${ampm}`
}