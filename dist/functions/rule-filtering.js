/**
 * Filter rules based on context variables
 * Returns only rules whose contextVars match the provided context
 */
export function filterRulesByContext(rules, context) {
    // TODO: Implement rule filtering logic
    return rules.filter(rule => {
        const { contextVars } = rule.condition;
        if (!contextVars)
            return true;
        // Check each context variable matches
        return Object.entries(contextVars).every(([key, requiredValue]) => {
            const contextValue = context[key];
            if (Array.isArray(requiredValue)) {
                // For array values, check if context value is in the array OR if context is an array with overlap
                if (Array.isArray(contextValue)) {
                    return requiredValue.some(v => contextValue.includes(v));
                }
                return requiredValue.includes(contextValue);
            }
            // For single values, check exact match or array membership
            if (Array.isArray(contextValue)) {
                return contextValue.includes(requiredValue);
            }
            return contextValue === requiredValue;
        });
    });
}
