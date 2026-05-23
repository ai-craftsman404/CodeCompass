/**
 * Core types for the Claude Code Audit Skill
 * Defines interfaces for rules, context, recommendations, and the recommendation engine
 */
/**
 * Rule condition: which context variables must match for this rule to apply
 */
export interface RuleCondition {
    contextVars: Record<string, string | string[]>;
    precedenceWeight: number;
}
/**
 * Rule action: what to recommend and how to enforce it
 */
export interface FileScaffold {
    path: string;
    template: string;
}
export interface RuleAction {
    type: 'scaffold' | 'audit' | 'hardening' | 'reporting';
    recommendation: string;
    files?: FileScaffold[];
    enforcementLevel: 'advisory' | 'soft-mandatory' | 'hard-mandatory';
}
/**
 * Complete audit rule definition
 */
export interface AuditRule {
    id: string;
    description: string;
    category: 'structure' | 'naming' | 'tooling' | 'compliance' | 'process' | 'testing';
    version?: string;
    lastModified?: string;
    deprecated?: boolean;
    replacedBy?: string;
    condition: RuleCondition;
    action: RuleAction;
    conflictsWith?: string[];
    overrides?: string[];
    rationale: string;
}
/**
 * Scored rule after precedence weighting applied
 */
export interface ScoredRule extends AuditRule {
    score: number;
}
/**
 * Resolved rule after conflict resolution
 */
export interface ResolvedRule extends ScoredRule {
    status: 'applied' | 'overridden' | 'deferred';
    overriddenBy?: string;
    explanation?: string;
}
/**
 * Context variables derived from user input and repo inference
 * 10 primary variables, derived from Tier 1/2/3 questionnaire
 */
export interface PrecedenceContext {
    PROFILE_STAGE: 'sandbox' | 'PoC' | 'MVP' | 'beta' | 'production' | 'sunset-legacy';
    COMPLIANCE_FRAMEWORK: string[];
    THREAT_LEVEL: 'none' | 'low' | 'medium' | 'high' | 'critical';
    TEAM_SCALE: 'solo' | 'pair-trio' | 'small' | 'multi-team' | 'enterprise';
    AI_PATTERN: 'none' | 'LLM API' | 'RAG' | 'fine-tuning' | 'agentic' | 'model training';
    CRITICALITY_TIER?: 'none' | 'low' | 'medium' | 'high' | 'critical';
    SECURITY_WEIGHT?: number;
    COMPLIANCE_WEIGHT?: number;
    THREAT_WEIGHT?: number;
    TEST_MATURITY?: 'none' | 'unit' | 'unit+integration' | 'unit+integration+E2E' | 'contract' | 'chaos';
    DOC_EXPECTATION?: 'minimal-informal' | 'inline comments' | 'ADRs' | 'runbooks' | 'full audit trail';
    REUSE_INTENT?: 'throwaway' | 'project-scoped' | 'shared library' | 'open-source' | 'product platform';
    DEPLOYMENT_TARGET?: 'local-dev' | 'cloud' | 'on-prem' | 'edge' | 'hybrid' | 'air-gapped';
    CI_MATURITY?: 'none' | 'basic' | 'full' | 'GitOps' | 'ADO';
    OBSERVABILITY_LEVEL?: 'none' | 'basic logging' | 'structured logs' | 'metrics+alerts' | 'full APM+tracing';
    RESOURCE_CONSTRAINT?: 'none' | 'minimal' | 'moderate' | 'severe';
    [key: string]: unknown;
}
/**
 * Inferred answers from repo scan with confidence scores
 */
export interface InferredTier1Answers {
    stage: {
        value: string;
        confidence: number;
    };
    team_scope: {
        value: string;
        confidence: number;
    };
    ai_involvement: {
        value: string;
        confidence: number;
    };
    compliance: {
        value: string;
        confidence: number;
    };
}
/**
 * Repo scan results
 */
export interface RepoScanResult {
    hasCI: boolean;
    hasTests: boolean;
    testTypes: string[];
    hasReadme: boolean;
    hasLicense: boolean;
    hasCodeowners: boolean;
    hasDocumentation: boolean;
    complianceMarkers: string[];
    codebaseSizeLines: number;
    aiPatternIndicators: string[];
    teamSizeIndicators: string[];
    estimatedCriticalFindings: number;
    inferred: InferredTier1Answers;
}
/**
 * Phasing recommendation
 */
export interface Phase {
    phase: number;
    label: string;
    duration: string;
    objectives: string[];
    successCriteria: string[];
    rules: ResolvedRule[];
    output: string;
}
/**
 * Phased recommendations (phase 1 is optional, phase 2 always present)
 */
export interface PhasedRecommendations {
    phase1: Phase | null;
    phase2: Phase;
}
/**
 * Single recommendation output for user
 */
export interface AuditRecommendation {
    ruleId: string;
    category: string;
    enforcementLevel: 'advisory' | 'soft-mandatory' | 'hard-mandatory';
    description: string;
    scaffold?: {
        folder: string;
        files: Array<{
            path: string;
            template: string;
        }>;
    };
    appliedBecause: {
        matchedContextVars: string[];
        precedenceScore: number;
        overriddenRules?: string[];
    };
    phase: 1 | 2;
    artifacts?: string[];
}
/**
 * Complete audit output
 */
export interface AuditOutput {
    phasing: PhasedRecommendations;
    recommendations: AuditRecommendation[];
    artifacts: string[];
    explanation: {
        contextVars: Record<string, unknown>;
        conflictsResolved: Array<{
            ruleA: string;
            ruleB: string;
            winner: string;
            reason: string;
        }>;
        phasingReason?: string;
    };
}
/**
 * Conflict between two rules
 */
export interface RuleConflict {
    ruleA: AuditRule;
    ruleB: AuditRule;
    reason: string;
}
/**
 * User cohort for progressive disclosure UX
 */
export type UserCohort = 'novice' | 'intermediate' | 'expert';
/**
 * Tier 1 answers (always present)
 */
export interface Tier1Answers {
    stage: string;
    team_scope: string;
    ai_involvement: string;
    compliance: string;
}
/**
 * Tier 2 answers (conditionally present based on Tier 1)
 */
export interface Tier2Answers {
    complianceDetails?: string;
    teamSize?: string;
    ciMaturity?: string;
    observabilityLevel?: string;
    aiPatternDetail?: string;
}
/**
 * Tier 3 answers (expert only, hidden by default)
 */
export interface Tier3Answers {
    stackTypeOverride?: string;
    deploymentTarget?: string;
    reuseIntent?: string;
    docExpectation?: string;
    testMaturity?: string;
    threatLevelOverride?: string;
    securityWeight?: number;
    complianceWeight?: number;
    threatWeight?: number;
}
/**
 * All user answers from questionnaire
 */
export interface UserAnswers {
    cohort: UserCohort;
    tier1: Tier1Answers;
    tier2?: Tier2Answers;
    tier3?: Tier3Answers;
    flagOverrides?: Record<string, unknown>;
}
/**
 * Skill input parameters
 */
export interface AuditSkillInput {
    projectPath: string;
    userAnswers?: UserAnswers;
    flagOverrides?: Record<string, unknown>;
    mode: 'scaffold' | 'audit';
}
//# sourceMappingURL=audit.d.ts.map