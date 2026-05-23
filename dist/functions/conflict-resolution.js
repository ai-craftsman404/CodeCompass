/**
 * Detect conflicts between two rules
 */
export function detectConflictsBetweenRules(ruleA, ruleB) {
    // Two rules conflict if they explicitly mention each other
    if (ruleA.conflictsWith?.includes(ruleB.id))
        return true;
    if (ruleB.conflictsWith?.includes(ruleA.id))
        return true;
    return false;
}
/**
 * Resolve conflict between two rules
 * Returns the ID of the winning rule
 */
export function resolveConflict(ruleA, ruleB, context) {
    // Rule 1: Explicit overrides
    if (ruleA.overrides?.includes(ruleB.id))
        return ruleA.id;
    if (ruleB.overrides?.includes(ruleA.id))
        return ruleB.id;
    // Rule 3: THREAT_LEVEL (85) overrides RESOURCE_CONSTRAINT (60)
    if (context.THREAT_LEVEL === 'critical') {
        const ruleAIsThreatRelated = ruleA.category === 'compliance' || ruleA.category === 'process';
        const ruleBIsThreatRelated = ruleB.category === 'compliance' || ruleB.category === 'process';
        if (ruleAIsThreatRelated && !ruleBIsThreatRelated)
            return ruleA.id;
        if (ruleBIsThreatRelated && !ruleAIsThreatRelated)
            return ruleB.id;
    }
    // Default: Higher precedence score wins
    return ruleA.score > ruleB.score ? ruleA.id : ruleB.id;
}
/**
 * Resolve all conflicts in a rule set
 */
export function resolveAllConflicts(rules, context) {
    // TODO: Implement full conflict resolution with transitive closure
    const resolved = [...rules];
    return resolved;
}
/**
 * Validate that no hard-mandatory rules were overridden
 */
export function validateConflictResolution(original, resolved) {
    const errors = [];
    // Check: no hard-mandatory rules should have status 'overridden'
    const overriddenHardMandatory = resolved.filter(r => r.status === 'overridden' && r.action.enforcementLevel === 'hard-mandatory');
    if (overriddenHardMandatory.length > 0) {
        errors.push(`Hard-mandatory rules cannot be overridden: ${overriddenHardMandatory.map(r => r.id).join(', ')}`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
