/**
 * Context Mapping Function
 * Maps Tier 1/2/3 questionnaire answers and inference signals to PrecedenceContext variables
 */

import { PrecedenceContext, Tier1Answers, Tier2Answers, Tier3Answers } from '../types/audit';

/**
 * Inference signals from repo scan with confidence scores
 */
export interface InferenceSignals {
  hasGitHubWorkflows?: boolean;
  gitTag?: string;
  hasCodeowners?: boolean;
  hasAgentDir?: boolean;
  [key: string]: unknown;
}

/**
 * Maps tier1, tier2, tier3 answers and flags to context variables
 * Handles fallbacks, deduplication, and precedence override logic
 */
export function mapTierAnswersToContext(
  tier1: Partial<Tier1Answers> = {},
  tier2: Partial<Tier2Answers> = {},
  tier3: Partial<Tier3Answers> = {},
  flags: Record<string, unknown> = {},
  signals: InferenceSignals = {}
): PrecedenceContext {
  const context: Partial<PrecedenceContext> = {};

  // ============================================================================
  // TIER 1 MAPPING
  // ============================================================================

  // T1-Q1: PROFILE_STAGE
  if (flags.PROFILE_STAGE) {
    context.PROFILE_STAGE = flags.PROFILE_STAGE as any;
  } else if (signals.gitTag && typeof signals.gitTag === 'string' && signals.gitTag.match(/^v\d+\.\d+\.\d+/)) {
    // Inference: release tag indicates production
    context.PROFILE_STAGE = 'production';
  } else if (signals.hasGitHubWorkflows) {
    // Inference: CI/CD workflows indicate beta at minimum
    context.PROFILE_STAGE = 'beta';
  } else if (tier1.stage) {
    const stage = tier1.stage;
    const validStages = ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'];
    if (validStages.includes(stage)) {
      context.PROFILE_STAGE = stage as any;
    } else {
      context.PROFILE_STAGE = 'PoC'; // fallback
    }
  } else {
    context.PROFILE_STAGE = 'PoC'; // fallback
  }

  // T1-Q2: TEAM_SCALE
  if (flags.TEAM_SCALE) {
    context.TEAM_SCALE = flags.TEAM_SCALE as any;
  } else if (signals.hasCodeowners) {
    // Inference: CODEOWNERS file indicates at least small team
    context.TEAM_SCALE = 'small';
  } else if (tier1.team_scope) {
    const team = tier1.team_scope;
    const validTeams = ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'];
    if (validTeams.includes(team)) {
      context.TEAM_SCALE = team as any;
    } else {
      context.TEAM_SCALE = 'solo'; // fallback
    }
  } else {
    context.TEAM_SCALE = 'solo'; // fallback
  }

  // T1-Q3: AI_PATTERN
  if (flags.AI_PATTERN) {
    context.AI_PATTERN = flags.AI_PATTERN as any;
  } else if (signals.hasAgentDir) {
    // Inference: /agents/ directory indicates agentic pattern
    context.AI_PATTERN = 'agentic';
  } else if (tier1.ai_involvement) {
    const pattern = tier1.ai_involvement;
    const validPatterns = ['none', 'LLM API', 'RAG', 'agentic', 'fine-tuning', 'training'];
    if (validPatterns.includes(pattern)) {
      context.AI_PATTERN = pattern as any;
    } else {
      context.AI_PATTERN = 'none'; // fallback
    }
  } else {
    context.AI_PATTERN = 'none'; // fallback
  }

  // T1-Q4: COMPLIANCE_FRAMEWORK (array with deduplication)
  if (flags.COMPLIANCE_FRAMEWORK) {
    const flagValue = flags.COMPLIANCE_FRAMEWORK;
    if (Array.isArray(flagValue)) {
      context.COMPLIANCE_FRAMEWORK = [...new Set(flagValue.map(String))];
    } else {
      context.COMPLIANCE_FRAMEWORK = [String(flagValue)];
    }
  } else if (tier1.compliance) {
    const compliance = tier1.compliance;
    const validFrameworks = ['none', 'GDPR', 'ISO27001', 'Cyber Essentials', 'SOC2', 'FedRAMP', 'HIPAA'];
    let frameworks: string[] = [];

    if (Array.isArray(compliance)) {
      // Array input: filter valid, deduplicate
      frameworks = compliance
        .map(c => String(c))
        .filter(c => validFrameworks.includes(c));
      if (frameworks.length === 0) {
        frameworks = ['none'];
      }
    } else if (typeof compliance === 'string') {
      // String input
      if (compliance === '' || compliance === 'none') {
        frameworks = ['none'];
      } else if (validFrameworks.includes(compliance)) {
        frameworks = [compliance];
      } else {
        frameworks = ['none']; // fallback
      }
    } else {
      frameworks = ['none']; // fallback
    }

    // Deduplicate
    context.COMPLIANCE_FRAMEWORK = [...new Set(frameworks)];
  } else {
    context.COMPLIANCE_FRAMEWORK = ['none']; // fallback
  }

  // ============================================================================
  // TIER 2 MAPPING (Conditional based on Tier 1 unlock conditions)
  // ============================================================================

  // T2-Q1: CI_MATURITY (unlocked if PROFILE_STAGE ∈ [beta, production])
  if (flags.CI_MATURITY) {
    context.CI_MATURITY = flags.CI_MATURITY as any;
  } else if (['beta', 'production'].includes(context.PROFILE_STAGE!)) {
    if (tier2.ciMaturity) {
      const validValues = ['none', 'basic', 'full', 'GitOps', 'ADO'];
      if (validValues.includes(tier2.ciMaturity)) {
        context.CI_MATURITY = tier2.ciMaturity as any;
      }
    }
  }

  // T2-Q2: OBSERVABILITY_LEVEL (unlocked if PROFILE_STAGE ∈ [beta, production])
  if (flags.OBSERVABILITY_LEVEL) {
    context.OBSERVABILITY_LEVEL = flags.OBSERVABILITY_LEVEL as any;
  } else if (['beta', 'production'].includes(context.PROFILE_STAGE!)) {
    if (tier2.observabilityLevel) {
      const validValues = ['none', 'basic logging', 'structured logs', 'metrics+alerts', 'full APM+tracing'];
      if (validValues.includes(tier2.observabilityLevel)) {
        context.OBSERVABILITY_LEVEL = tier2.observabilityLevel as any;
      }
    }
  }

  // ============================================================================
  // TIER 3 MAPPING (Expert only, via "Customise further" toggle)
  // ============================================================================

  // T3-Q1: DEPLOYMENT_TARGET
  if (flags.DEPLOYMENT_TARGET) {
    context.DEPLOYMENT_TARGET = flags.DEPLOYMENT_TARGET as any;
  } else if (tier3.deploymentTarget) {
    const validValues = ['local-dev', 'cloud', 'on-prem', 'edge', 'hybrid', 'air-gapped'];
    if (validValues.includes(tier3.deploymentTarget)) {
      context.DEPLOYMENT_TARGET = tier3.deploymentTarget as any;
    }
  }

  // T3-Q2: TEST_MATURITY
  if (flags.TEST_MATURITY) {
    context.TEST_MATURITY = flags.TEST_MATURITY as any;
  } else if (tier3.testMaturity) {
    const validValues = ['none', 'unit', 'unit+integration', 'unit+integration+E2E', 'contract', 'chaos'];
    if (validValues.includes(tier3.testMaturity)) {
      context.TEST_MATURITY = tier3.testMaturity as any;
    }
  }

  // T3-Q3: THREAT_LEVEL
  if (flags.THREAT_LEVEL) {
    context.THREAT_LEVEL = flags.THREAT_LEVEL as any;
  } else if (tier3.threatLevelOverride) {
    const validValues = ['none', 'low', 'medium', 'high', 'critical'];
    if (validValues.includes(tier3.threatLevelOverride)) {
      context.THREAT_LEVEL = tier3.threatLevelOverride as any;
    }
  }

  // T3-Q4: SECURITY_WEIGHT
  if (flags.SECURITY_WEIGHT !== undefined) {
    context.SECURITY_WEIGHT = Number(flags.SECURITY_WEIGHT);
  } else if (tier3.securityWeight !== undefined) {
    context.SECURITY_WEIGHT = tier3.securityWeight;
  }

  // ============================================================================
  // COMPLIANCE FRAMEWORK PRECEDENCE OVERRIDE
  // When compliance ≠ 'none', it overrides PROFILE_STAGE suppression
  // ============================================================================
  // This is implicit: compliance rules are always applied regardless of stage

  return context as PrecedenceContext;
}
