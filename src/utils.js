/**
 * Gets the salary period date range (26th of last month to 25th of current month)
 * @returns {{ months: Array<{month: number, year: number}>, startDate: Date, endDate: Date }}
 */
export function getDateRange() {
    const today = new Date();
    const currentDay = today.getDate();

    let startDate, endDate;

    if (currentDay >= 26) {
        // We're in the current salary period (26th of this month to 25th of next month)
        startDate = new Date(today.getFullYear(), today.getMonth(), 26);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    } else {
        // We're in the previous salary period (26th of last month to 25th of this month)
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 26);
        endDate = new Date(today.getFullYear(), today.getMonth(), 25);
    }

    // Get unique months in the range
    const months = [];
    const current = new Date(startDate);
    current.setDate(1); // Start from first of month to avoid date overflow issues

    while (current <= endDate) {
        const month = current.getMonth() + 1; // 1-indexed
        const year = current.getFullYear();

        if (!months.some(m => m.month === month && m.year === year)) {
            months.push({ month, year });
        }

        current.setMonth(current.getMonth() + 1);
    }

    return { months, startDate, endDate };
}

/**
 * Formats a date as YYYY-MM-DD (local time)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Checks if a date is within the specified range
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {boolean}
 */
export function isDateInRange(dateStr, startDate, endDate) {
    const date = new Date(dateStr);
    return date >= startDate && date <= endDate;
}

/**
 * Formats a date for display
 * @param {string} dateStr - Date string
 * @returns {string}
 */
export function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
