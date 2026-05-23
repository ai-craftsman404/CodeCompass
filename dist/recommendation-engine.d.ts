/**
 * Recommendation Engine for Audit Skill
 * Orchestrates: rule filtering → scoring → conflict resolution → phasing → output rendering
 */
import { AuditRule, PrecedenceContext, ScoredRule, ResolvedRule, AuditOutput, AuditRecommendation, PhasedRecommendations, RepoScanResult } from './types/audit';
/**
 * Load all rules from .claude/audit-rules/templates/
 */
export declare function loadAllRules(rulesDir: string): Promise<AuditRule[]>;
/**
 * Filter rules to only those applicable to the current context
 */
export declare function filterRulesByContext(rules: AuditRule[], context: PrecedenceContext): AuditRule[];
/**
 * Score each rule based on precedence matrix and context
 */
export declare function scoreRules(rules: AuditRule[], context: PrecedenceContext): ScoredRule[];
/**
 * Determine if phasing (triage + full audit) should be suggested
 */
export declare function shouldSuggestPhasing(context: PrecedenceContext, scanResults: RepoScanResult): boolean;
/**
 * Organize resolved rules into phased approach (optional phase 1 + mandatory phase 2)
 */
export declare function determinePhasedRecommendations(resolved: ResolvedRule[], shouldPhase: boolean): PhasedRecommendations;
/**
 * Render individual recommendation for user output
 */
export declare function renderRecommendation(rule: ResolvedRule, phaseNum: 1 | 2, context: PrecedenceContext): AuditRecommendation;
/**
 * Main recommendation generation engine
 */
export declare function generateRecommendations(projectPath: string, context: PrecedenceContext, scanResults: RepoScanResult, rulesDir: string): Promise<AuditOutput>;
//# sourceMappingURL=recommendation-engine.d.ts.map