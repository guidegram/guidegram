/**
 * src/services/julesQuestionResolver.ts
 * Google Jules Autonomous Question & Plan Resolver Protocol
 * Automatically detects and resolves sessions blocked in AWAITING_USER_FEEDBACK.
 * Distinguishes plan approvals from agent questions, injects unblocking directives, and prevents worker stalls.
 */

export interface JulesActivity {
  id: string;
  name: string;
  createTime: string;
  originator: 'USER' | 'AGENT' | 'SYSTEM';
  planGenerated?: {
    steps: Array<{ title: string; description: string }>;
  };
  agentMessaged?: {
    message: string;
  };
}

export interface ResolutionResult {
  sessionId: string;
  actionTaken: 'PLAN_APPROVED' | 'MESSAGE_REPLIED' | 'NO_ACTION' | 'MAX_RETRIES_REACHED';
  detail: string;
  timestamp: string;
}

export class JulesQuestionResolver {
  private static instance: JulesQuestionResolver | null = null;
  private retryCounts: Map<string, number> = new Map();
  private maxRetriesPerSession: number = 2;

  private constructor() {}

  public static getInstance(): JulesQuestionResolver {
    if (!JulesQuestionResolver.instance) {
      JulesQuestionResolver.instance = new JulesQuestionResolver();
    }
    return JulesQuestionResolver.instance;
  }

  /**
   * Resolves a blocked session based on its latest activities
   */
  public resolveBlockedSession(
    sessionId: string,
    activities: JulesActivity[],
    customDirective?: string
  ): ResolutionResult {
    const retries = this.retryCounts.get(sessionId) || 0;
    if (retries >= this.maxRetriesPerSession) {
      return {
        sessionId,
        actionTaken: 'MAX_RETRIES_REACHED',
        detail: `Session ${sessionId} has reached maximum question retry attempts (${this.maxRetriesPerSession}).`,
        timestamp: new Date().toISOString(),
      };
    }

    // Inspect activities in reverse chronological order
    const latestActivity = activities[activities.length - 1];

    if (!latestActivity) {
      return {
        sessionId,
        actionTaken: 'NO_ACTION',
        detail: 'No activities found in session stream.',
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Check if awaiting plan approval
    if (latestActivity.planGenerated) {
      this.retryCounts.set(sessionId, retries + 1);
      return {
        sessionId,
        actionTaken: 'PLAN_APPROVED',
        detail: `Approved plan with ${latestActivity.planGenerated.steps.length} steps.`,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Check if agent asked a clarifying question
    if (latestActivity.agentMessaged) {
      this.retryCounts.set(sessionId, retries + 1);
      const directive =
        customDirective ||
        'Proceed with recommended autonomous implementation adhering to TypeScript strict mode and production performance guidelines.';

      return {
        sessionId,
        actionTaken: 'MESSAGE_REPLIED',
        detail: `Replied with autonomous unblocking directive: "${directive}"`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      sessionId,
      actionTaken: 'NO_ACTION',
      detail: 'Session is not blocked by a pending plan or agent question.',
      timestamp: new Date().toISOString(),
    };
  }

  public resetSession(sessionId: string): void {
    this.retryCounts.delete(sessionId);
  }

  public destroy(): void {
    this.retryCounts.clear();
  }
}
