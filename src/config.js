import 'dotenv/config';

export const config = {
    hrms: {
        baseUrl: 'https://hrms.pitsolutions.com',
        apiPath: '/hrmsapi/api/v1',
        accessToken: null,
        xsrfToken: null,
        mappingId: 'P4D9T6HA',
    },
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        notifyEmail: process.env.NOTIFY_EMAIL,
    },
};

/**
 * Updates the HRMS tokens (from browser session)
 * @param {{ accessToken: string, xsrfToken: string, mappingId: string }} tokens
 */
export function setTokens(tokens) {
    config.hrms.accessToken = tokens.accessToken;
    config.hrms.xsrfToken = tokens.xsrfToken;
    config.hrms.mappingId = tokens.mappingId;
}

/**
 * Validates that email configuration is present
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig() {
    const errors = [];

    if (!config.email.user) {
        errors.push('SMTP_USER is required for sending email notifications');
    }
    if (!config.email.pass) {
        errors.push('SMTP_PASS is required for SMTP authentication');
    }
    if (!config.email.notifyEmail) {
        errors.push('NOTIFY_EMAIL is required - where to send absence alerts');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
