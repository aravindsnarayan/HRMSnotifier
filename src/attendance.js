import { config } from './config.js';
import { getAuthHeaders, getCookieHeader } from './auth.js';
import { formatDate, isDateInRange, getDateRange } from './utils.js';

// Tag types from the HRMS system
const TAG_TYPES = {
    PRESENT: 1,
    ABSENT: 3,
    WEEKLY_OFF: 5,
    HOLIDAY: 7,
    LEAVE: 9,
};

/**
 * Fetches monthly attendance summary from HRMS API
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @returns {Promise<Object>}
 */
async function fetchMonthlyAttendance(month, year) {
    const currentDate = formatDate(new Date());
    const url = new URL(
        `${config.hrms.baseUrl}${config.hrms.apiPath}/attendance-management/dashboard/attendance-summary/get-monthly-attendance-summary`
    );

    url.searchParams.set('month', month.toString());
    url.searchParams.set('year', year.toString());
    url.searchParams.set('currentCalendarDate', currentDate);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            ...getAuthHeaders(),
            'Cookie': getCookieHeader(),
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch attendance: ${response.status} - ${text}`);
    }

    return response.json();
}

/**
 * Extracts absent days from attendance data
 * @param {Object} data - API response data
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array<{date: string, status: string}>}
 */
function extractAbsentDays(data, startDate, endDate) {
    const absentDays = [];

    if (!data?.Data?.DailyAttendanceSummary) {
        return absentDays;
    }

    for (const day of data.Data.DailyAttendanceSummary) {
        const date = day.ShiftDetails?.Date;

        if (!date || !isDateInRange(date, startDate, endDate)) {
            continue;
        }

        const statuses = day.DailyAttendanceStatus || [];

        for (const status of statuses) {
            if (status.TagType === TAG_TYPES.ABSENT) {
                absentDays.push({
                    date,
                    status: status.TagName || 'Absent',
                });
                break;
            }
        }
    }

    return absentDays;
}

/**
 * Checks attendance for the past N days and returns absent days
 * @param {number} days - Number of days to check (default: 31)
 * @returns {Promise<{absentDays: Array<{date: string, status: string}>, totalAbsent: number, summary: Object}>}
 */
export async function checkAttendance(days = 31) {
    const { months, startDate, endDate } = getDateRange(days);

    console.log(`📅 Checking attendance from ${formatDate(startDate)} to ${formatDate(endDate)}`);

    const allAbsentDays = [];
    let totalAbsentCount = 0;
    const monthlySummaries = [];

    for (const { month, year } of months) {
        console.log(`   Fetching ${month}/${year}...`);

        try {
            const data = await fetchMonthlyAttendance(month, year);

            // Get count from summary
            const countDetails = data?.Data?.CountDetails;
            if (countDetails?.AbsentCount) {
                totalAbsentCount += countDetails.AbsentCount;
            }

            monthlySummaries.push({
                month,
                year,
                present: countDetails?.PresentCount || 0,
                absent: countDetails?.AbsentCount || 0,
                leave: countDetails?.LeaveCount || 0,
                holiday: countDetails?.HolidayCount || 0,
                weeklyOff: countDetails?.WeeklyOffCount || 0,
            });

            // Extract specific absent days within our range
            const absentDays = extractAbsentDays(data, startDate, endDate);
            allAbsentDays.push(...absentDays);

        } catch (error) {
            console.error(`   ❌ Error fetching ${month}/${year}:`, error.message);
            throw error;
        }
    }

    return {
        absentDays: allAbsentDays,
        totalAbsent: allAbsentDays.length,
        summary: monthlySummaries,
    };
}
