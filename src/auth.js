import { config } from './config.js';

/**
 * Generates the authentication headers required for HRMS API calls
 * @returns {Record<string, string>}
 */
export function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${config.hrms.accessToken}`,
        'Mappingid': config.hrms.mappingId,
        'X-XSRF-TOKEN': config.hrms.xsrfToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

/**
 * Generates the cookie header for HRMS API calls
 * @returns {string}
 */
export function getCookieHeader() {
    return `hr_atk=${config.hrms.accessToken}; XSRF-TOKEN=${config.hrms.xsrfToken}; hr_mid=${config.hrms.mappingId}`;
}
