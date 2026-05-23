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
  tier1: Partial<Tier1Answers> | null = null,
  tier2: Partial<Tier2Answers> | null = null,
  tier3: Partial<Tier3Answers> | null = null,
  flags: Record<string, unknown> | null = null,
  signals: InferenceSignals | null = null
): PrecedenceContext {
  const context: Partial<PrecedenceContext> = {};

  // Normalize null inputs
  const _tier1 = tier1 || {};
  const _tier2 = tier2 || {};
  const _tier3 = tier3 || {};
  const _flags = flags || {};
  const _signals = signals || {};

  // ============================================================================
  // TIER 1 MAPPING
  // ============================================================================

  // T1-Q1: PROFILE_STAGE
  if (_flags.PROFILE_STAGE) {
    context.PROFILE_STAGE = _flags.PROFILE_STAGE as any;
  } else if (_signals.gitTag && typeof _signals.gitTag === 'string' && _signals.gitTag.match(/^v\d+\.\d+\.\d+/)) {
    // Inference: release tag indicates production
    context.PROFILE_STAGE = 'production';
  } else if (_signals.hasGitHubWorkflows) {
    // Inference: CI/CD workflows indicate beta at minimum
    context.PROFILE_STAGE = 'beta';
  } else if (_tier1.stage) {
    const stage = _tier1.stage;
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
  if (_flags.TEAM_SCALE) {
    context.TEAM_SCALE = _flags.TEAM_SCALE as any;
  } else if (_signals.hasCodeowners) {
    // Inference: CODEOWNERS file indicates at least small team
    context.TEAM_SCALE = 'small';
  } else if (_tier1.team_scope) {
    const team = _tier1.team_scope;
    const validTeams = ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'];
    if (validTeams.includes(team)) {
      context.TEAM_SCALE = team as any;
    } else {
      context.TEAM_SCALE = 'solo'; // fallback
    }
  } else {
    context.TEAM_SCALE = 'solo'; // fallback
  }

  // T1-Q3: AI_PATTERN (User answers override inference signals)
  if (_flags.AI_PATTERN) {
    context.AI_PATTERN = _flags.AI_PATTERN as any;
  } else if (_tier1.ai_involvement) {
    const pattern = _tier1.ai_involvement;
    const validPatterns = ['none', 'LLM API', 'RAG', 'agentic', 'fine-tuning', 'training'];
    if (validPatterns.includes(pattern)) {
      context.AI_PATTERN = pattern as any;
    } else {
      context.AI_PATTERN = 'none'; // fallback
    }
  } else if (_signals.hasAgentDir) {
    // Inference: /agents/ directory indicates agentic pattern (only if user didn't answer)
    context.AI_PATTERN = 'agentic';
  } else {
    context.AI_PATTERN = 'none'; // fallback
  }

  // T1-Q4: COMPLIANCE_FRAMEWORK (array with deduplication)
  if (_flags.COMPLIANCE_FRAMEWORK) {
    const flagValue = _flags.COMPLIANCE_FRAMEWORK;
    if (Array.isArray(flagValue)) {
      context.COMPLIANCE_FRAMEWORK = [...new Set(flagValue.map(String))];
    } else {
      context.COMPLIANCE_FRAMEWORK = [String(flagValue)];
    }
  } else if (_tier1.compliance) {
    const compliance = _tier1.compliance;
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
  if (_flags.CI_MATURITY) {
    context.CI_MATURITY = _flags.CI_MATURITY as any;
  } else if (['beta', 'production'].includes(context.PROFILE_STAGE!)) {
    if (_tier2.ciMaturity) {
      const validValues = ['none', 'basic', 'full', 'GitOps', 'ADO'];
      if (validValues.includes(_tier2.ciMaturity)) {
        context.CI_MATURITY = _tier2.ciMaturity as any;
      }
    }
  }

  // T2-Q2: OBSERVABILITY_LEVEL (unlocked if PROFILE_STAGE ∈ [beta, production])
  if (_flags.OBSERVABILITY_LEVEL) {
    context.OBSERVABILITY_LEVEL = _flags.OBSERVABILITY_LEVEL as any;
  } else if (['beta', 'production'].includes(context.PROFILE_STAGE!)) {
    if (_tier2.observabilityLevel) {
      const validValues = ['none', 'logging', 'structured', 'metrics', 'metrics+alerts', 'APM', 'full APM+tracing'];
      if (validValues.includes(_tier2.observabilityLevel)) {
        context.OBSERVABILITY_LEVEL = _tier2.observabilityLevel as any;
      }
    }
  }

  // ============================================================================
  // TIER 3 MAPPING (Expert only, via "Customise further" toggle)
  // ============================================================================

  // T3-Q1: DEPLOYMENT_TARGET
  if (_flags.DEPLOYMENT_TARGET) {
    context.DEPLOYMENT_TARGET = _flags.DEPLOYMENT_TARGET as any;
  } else if (_tier3.deploymentTarget) {
    const validValues = ['local-dev', 'cloud', 'on-prem', 'edge', 'hybrid', 'air-gapped'];
    if (validValues.includes(_tier3.deploymentTarget)) {
      context.DEPLOYMENT_TARGET = _tier3.deploymentTarget as any;
    }
  }

  // T3-Q2: TEST_MATURITY
  if (_flags.TEST_MATURITY) {
    context.TEST_MATURITY = _flags.TEST_MATURITY as any;
  } else if (_tier3.testMaturity) {
    const validValues = ['none', 'unit', 'unit+integration', 'unit+integration+E2E', 'contract', 'chaos'];
    if (validValues.includes(_tier3.testMaturity)) {
      context.TEST_MATURITY = _tier3.testMaturity as any;
    }
  }

  // T3-Q3: THREAT_LEVEL
  if (_flags.THREAT_LEVEL) {
    context.THREAT_LEVEL = _flags.THREAT_LEVEL as any;
  } else if (_tier3.threatLevelOverride) {
    const validValues = ['none', 'low', 'medium', 'high', 'critical'];
    if (validValues.includes(_tier3.threatLevelOverride)) {
      context.THREAT_LEVEL = _tier3.threatLevelOverride as any;
    }
  }

  // T3-Q4: SECURITY_WEIGHT
  if (_flags.SECURITY_WEIGHT !== undefined) {
    context.SECURITY_WEIGHT = Number(_flags.SECURITY_WEIGHT);
  } else if (_tier3.securityWeight !== undefined) {
    context.SECURITY_WEIGHT = _tier3.securityWeight;
  }

  // ============================================================================
  // COMPLIANCE FRAMEWORK PRECEDENCE OVERRIDE
  // When compliance ≠ 'none', it overrides PROFILE_STAGE suppression
  // ============================================================================
  // This is implicit: compliance rules are always applied regardless of stage

  return context as PrecedenceContext;
}
