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
export declare function mapTierAnswersToContext(tier1?: Partial<Tier1Answers>, tier2?: Partial<Tier2Answers>, tier3?: Partial<Tier3Answers>, flags?: Record<string, unknown>, signals?: InferenceSignals): PrecedenceContext;
//# sourceMappingURL=context-mapping.d.ts.map