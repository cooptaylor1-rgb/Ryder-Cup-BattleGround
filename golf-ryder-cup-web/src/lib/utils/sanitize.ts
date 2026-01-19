/**
 * Input Sanitization Utilities
 *
 * Provides XSS protection and input validation for user-submitted content.
 * Follows OWASP recommendations for sanitization.
 */

// ============================================
// HTML ENTITY MAP
// ============================================

const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#x3D;',
};

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    // First decode any HTML entities
    const decoded = input
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");

    // Then strip all tags
    return decoded.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a string for use in URLs
 */
export function sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
        return '';
    }

    // Remove any whitespace
    const trimmed = url.trim();

    // Block dangerous protocols
    const lowerUrl = trimmed.toLowerCase();
    if (
        lowerUrl.startsWith('javascript:') ||
        lowerUrl.startsWith('data:') ||
        lowerUrl.startsWith('vbscript:')
    ) {
        return '';
    }

    // Allow relative URLs, http, https, mailto, tel
    if (
        trimmed.startsWith('/') ||
        trimmed.startsWith('#') ||
        lowerUrl.startsWith('http://') ||
        lowerUrl.startsWith('https://') ||
        lowerUrl.startsWith('mailto:') ||
        lowerUrl.startsWith('tel:')
    ) {
        return trimmed;
    }

    // For anything else, assume it's a relative path
    return trimmed;
}

/**
 * Sanitize input for SQL-like injection (defense in depth)
 * Note: Always use parameterized queries, this is just an extra layer
 */
export function sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    // Remove common SQL injection patterns
    return input
        .replace(/'/g, "''") // Escape single quotes
        .replace(/--/g, '') // Remove SQL comments
        .replace(/;/g, '') // Remove semicolons
        .replace(/\/\*/g, '') // Remove block comment start
        .replace(/\*\//g, ''); // Remove block comment end
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') {
        return '';
    }
    return filename
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/[/\\]/g, '') // Remove path separators
        .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename chars
        .trim();
}

/**
 * Sanitize player name for display
 */
export function sanitizePlayerName(name: string): string {
    if (typeof name !== 'string') {
        return '';
    }
    // Allow letters, spaces, hyphens, apostrophes, periods
    return name
        .replace(/[^a-zA-Z\s\-'.]/g, '')
        .trim()
        .slice(0, 100); // Limit length
}

/**
 * Sanitize team name for display
 */
export function sanitizeTeamName(name: string): string {
    if (typeof name !== 'string') {
        return '';
    }
    // Allow alphanumeric, spaces, hyphens
    return name
        .replace(/[^a-zA-Z0-9\s\-]/g, '')
        .trim()
        .slice(0, 50); // Limit length
}

/**
 * Sanitize score input (should be numeric)
 */
export function sanitizeScore(input: string | number): number | null {
    if (typeof input === 'number') {
        if (isNaN(input) || input < 0 || input > 20) {
            return null;
        }
        return Math.floor(input);
    }

    if (typeof input === 'string') {
        const num = parseInt(input, 10);
        if (isNaN(num) || num < 0 || num > 20) {
            return null;
        }
        return num;
    }

    return null;
}

/**
 * Sanitize handicap input
 */
export function sanitizeHandicap(input: string | number): number | null {
    if (typeof input === 'number') {
        if (isNaN(input) || input < -10 || input > 54) {
            return null;
        }
        return Math.round(input * 10) / 10; // Round to 1 decimal
    }

    if (typeof input === 'string') {
        const num = parseFloat(input);
        if (isNaN(num) || num < -10 || num > 54) {
            return null;
        }
        return Math.round(num * 10) / 10;
    }

    return null;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    if (typeof email !== 'string') {
        return false;
    }
    // Basic email regex - not exhaustive but catches most issues
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
    if (typeof phone !== 'string') {
        return false;
    }
    // Allow digits, spaces, dashes, parentheses, plus
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(cleaned);
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
    if (typeof uuid !== 'string') {
        return false;
    }
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
    if (typeof date !== 'string') {
        return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return false;
    }
    // Check if it's a valid date
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
}

// ============================================
// OBJECT SANITIZATION
// ============================================

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    options: {
        stripHtml?: boolean;
        escapeHtml?: boolean;
        maxDepth?: number;
    } = {}
): T {
    const { stripHtml: strip = false, escapeHtml: escape = true, maxDepth = 10 } = options;

    function sanitizeValue(value: unknown, depth: number): unknown {
        if (depth > maxDepth) {
            return value;
        }

        if (typeof value === 'string') {
            if (strip) {
                return stripHtml(value);
            }
            if (escape) {
                return escapeHtml(value);
            }
            return value;
        }

        if (Array.isArray(value)) {
            return value.map((item) => sanitizeValue(item, depth + 1));
        }

        if (value !== null && typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value)) {
                result[key] = sanitizeValue(val, depth + 1);
            }
            return result;
        }

        return value;
    }

    return sanitizeValue(obj, 0) as T;
}

// ============================================
// UTILITY: Create a safe display string
// ============================================

/**
 * Create a safe string for display in the UI
 * Combines stripping HTML and limiting length
 */
export function safeDisplayString(
    input: string | null | undefined,
    maxLength: number = 200
): string {
    if (!input) {
        return '';
    }
    const stripped = stripHtml(String(input));
    if (stripped.length > maxLength) {
        return stripped.slice(0, maxLength - 3) + '...';
    }
    return stripped;
}
