/**
 * src/services/julesOutputValidator.ts
 * Google Jules Repoless Output Validation & Anti-Empty Gate Protocol
 * Enforces strict quality gates, rejects hollow/empty responses, and validates payload completeness.
 * Prevents poisoned empty datasets, tracks completeness scores, and guarantees zero memory leaks.
 */

export interface ValidationReport {
  isValid: boolean;
  completenessScore: number; // 0.0 to 1.0
  rejectionReason?: string;
  missingFields: string[];
  emptyArrays: string[];
  nullFields: string[];
}

export class JulesOutputValidator {
  private static instance: JulesOutputValidator | null = null;
  private minCompletenessThreshold: number = 0.7;

  private constructor() {}

  public static getInstance(): JulesOutputValidator {
    if (!JulesOutputValidator.instance) {
      JulesOutputValidator.instance = new JulesOutputValidator();
    }
    return JulesOutputValidator.instance;
  }

  /**
   * Validates output payload against required keys and completeness standards
   */
  public validate(payload: unknown, requiredFields: string[] = []): ValidationReport {
    const report: ValidationReport = {
      isValid: false,
      completenessScore: 0,
      missingFields: [],
      emptyArrays: [],
      nullFields: [],
    };

    if (!payload || typeof payload !== 'object') {
      report.rejectionReason = 'Payload is null, undefined, or not a JSON object.';
      return report;
    }

    const obj = payload as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      report.rejectionReason = 'Payload object is empty (zero keys).';
      return report;
    }

    // Check required fields presence
    for (const req of requiredFields) {
      if (!(req in obj)) {
        report.missingFields.push(req);
      }
    }

    let nonNullCount = 0;
    let totalAssessed = keys.length;

    for (const key of keys) {
      const val = obj[key];
      if (val === null || val === undefined) {
        report.nullFields.push(key);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          report.emptyArrays.push(key);
        } else {
          nonNullCount++;
        }
      } else if (typeof val === 'string' && val.trim() === '') {
        report.nullFields.push(key);
      } else {
        nonNullCount++;
      }
    }

    report.completenessScore = totalAssessed > 0 ? nonNullCount / totalAssessed : 0;

    // Evaluate anti-empty gate
    if (report.missingFields.length > 0) {
      report.isValid = false;
      report.rejectionReason = `Missing required fields: ${report.missingFields.join(', ')}`;
    } else if (report.emptyArrays.length > 0 && report.emptyArrays.some((k) => requiredFields.includes(k))) {
      report.isValid = false;
      report.rejectionReason = `Required array fields are hollow: ${report.emptyArrays.join(', ')}`;
    } else if (report.completenessScore < this.minCompletenessThreshold) {
      report.isValid = false;
      report.rejectionReason = `Payload completeness score (${(report.completenessScore * 100).toFixed(1)}%) below required threshold (${this.minCompletenessThreshold * 100}%).`;
    } else {
      report.isValid = true;
    }

    return report;
  }

  public setThreshold(threshold: number): void {
    this.minCompletenessThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  public destroy(): void {
    // Stateless validator cleanup
  }
}
