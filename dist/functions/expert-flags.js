/**
 * Parse and validate expert flag overrides
 */
export function parseAndValidateFlags(flags) {
    const errors = [];
    const parsed = {};
    // Whitelist of allowed flags
    const allowedFlags = {
        PROFILE_STAGE: ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'],
        COMPLIANCE_FRAMEWORK: 'array',
        THREAT_LEVEL: ['none', 'low', 'medium', 'high', 'critical'],
        TEAM_SCALE: ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'],
        AI_PATTERN: ['none', 'LLM API', 'RAG', 'fine-tuning', 'agentic', 'model training'],
        SECURITY_WEIGHT: 'number-0-100',
        COMPLIANCE_WEIGHT: 'number-0-100',
        THREAT_WEIGHT: 'number-0-100'
    };
    for (const [key, value] of Object.entries(flags)) {
        if (!(key in allowedFlags)) {
            errors.push(`Flag not recognized: ${key}`);
            continue;
        }
        const allowed = allowedFlags[key];
        // Validate based on type
        if (Array.isArray(allowed)) {
            if (!allowed.includes(value)) {
                errors.push(`${key}: invalid value '${value}', expected one of: ${allowed.join(', ')}`);
            }
            else {
                parsed[key] = value;
            }
        }
        else if (allowed === 'number-0-100') {
            const num = Number(value);
            if (isNaN(num) || num < 0 || num > 100) {
                errors.push(`${key}: must be a number between 0-100, got '${value}'`);
            }
            else {
                parsed[key] = num;
            }
        }
    }
    return { valid: errors.length === 0, errors, parsed };
}
/**
 * Apply flag overrides (validates and returns object)
 * Throws on invalid values
 */
export function applyFlagOverrides(flags = {}) {
    if (!flags)
        return {};
    const result = {};
    // Whitelist of allowed flags with validation rules
    const allowedFlags = {
        PROFILE_STAGE: (val) => ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'].includes(String(val)),
        COMPLIANCE_FRAMEWORK: (val) => typeof val === 'string' || Array.isArray(val),
        THREAT_LEVEL: (val) => ['none', 'low', 'medium', 'high', 'critical'].includes(String(val)),
        TEAM_SCALE: (val) => ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'].includes(String(val)),
        AI_PATTERN: (val) => ['none', 'LLM API', 'RAG', 'fine-tuning', 'agentic', 'model training'].includes(String(val)),
        SECURITY_WEIGHT: (val) => {
            const num = Number(val);
            return !isNaN(num) && num >= 0 && num <= 100;
        },
        COMPLIANCE_WEIGHT: (val) => {
            const num = Number(val);
            return !isNaN(num) && num >= 0 && num <= 100;
        },
        THREAT_WEIGHT: (val) => {
            const num = Number(val);
            return !isNaN(num) && num >= 0 && num <= 100;
        }
    };
    for (const [key, value] of Object.entries(flags)) {
        if (!(key in allowedFlags)) {
            throw new Error(`Flag not recognized: ${key}`);
        }
        const validator = allowedFlags[key];
        if (!validator(value)) {
            if (key.endsWith('_WEIGHT')) {
                throw new Error(`${key}: must be a number between 0-100, got '${value}'`);
            }
            else {
                throw new Error(`${key}: invalid value '${value}', not in allowed list`);
            }
        }
        // Convert numeric strings to numbers for weight fields
        if (key.endsWith('_WEIGHT')) {
            result[key] = Number(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
