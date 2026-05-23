/**
 * Apply precedence matrix scoring to a rule based on context
 */
export function applyPrecedenceMatrix(rule, context) {
    // TODO: Implement precedence scoring logic
    let score = rule.condition.precedenceWeight || 50;
    // Apply context variable weighting (numeric factors)
    const securityFactor = (context.SECURITY_WEIGHT || 60) / 100;
    const complianceFactor = (context.COMPLIANCE_WEIGHT || 50) / 100;
    const threatFactor = (context.THREAT_WEIGHT || 40) / 100;
    // Formula: weighted combination of factors
    score = score * (securityFactor * 0.35 + complianceFactor * 0.25 + threatFactor * 0.2);
    // Boost score if rule matches COMPLIANCE_FRAMEWORK
    if (context.COMPLIANCE_FRAMEWORK && context.COMPLIANCE_FRAMEWORK.length > 0 && rule.category === 'compliance') {
        score *= 1.5;
    }
    // Boost score if rule matches THREAT_LEVEL (compliance/process categories address security threats)
    if (context.THREAT_LEVEL === 'critical' && (rule.category === 'compliance' || rule.category === 'process')) {
        score *= 1.3;
    }
    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}
/**
 * Score multiple rules based on context
 */
export function scoreRules(rules, context) {
    return rules.map(rule => ({
        ...rule,
        score: applyPrecedenceMatrix(rule, context)
    }));
}
