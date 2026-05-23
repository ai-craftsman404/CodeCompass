/**
 * Rule filtering: filter rules by context variables
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { AuditRule, PrecedenceContext } from '../types/audit';

/**
 * Filter rules based on context variables
 * Returns only rules whose contextVars match the provided context
 */
export function filterRulesByContext(rules: AuditRule[], context: PrecedenceContext): AuditRule[] {
  // TODO: Implement rule filtering logic
  return rules.filter(rule => {
    const { contextVars } = rule.condition;
    if (!contextVars) return true;

    // Check each context variable matches
    return Object.entries(contextVars).every(([key, requiredValue]) => {
      const contextValue = (context as Record<string, unknown>)[key];
      if (Array.isArray(requiredValue)) {
        // For array values, check if context value is in the array OR if context is an array with overlap
        if (Array.isArray(contextValue)) {
          return requiredValue.some(v => contextValue.includes(v as string));
        }
        return requiredValue.includes(contextValue as never);
      }
      // For single values, check exact match or array membership
      if (Array.isArray(contextValue)) {
        return contextValue.includes(requiredValue as never);
      }
      return contextValue === requiredValue;
    });
  });
}
