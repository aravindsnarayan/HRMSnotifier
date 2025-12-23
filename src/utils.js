/**
 * Gets the date range for the past N days
 * @param {number} days - Number of days to look back
 * @returns {{ months: Array<{month: number, year: number}>, startDate: Date, endDate: Date }}
 */
export function getDateRange(days = 31) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get unique months in the range
    const months = [];
    const current = new Date(startDate);

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
 * Formats a date as YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
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
