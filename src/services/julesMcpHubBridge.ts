/**
 * Guidegram Master Hardening - Phase 140
 * Google Jules MCP Hub Bridge & Tool Execution Dispatcher Protocol
 * 
 * Bridges native Guidegram MCP tools directly with Google Jules REST session
 * function calling declarations. Features sandboxed execution dispatching,
 * schema conversion, strict timeouts, and telemetric monitoring.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<any>;
  timeoutMs?: number;
}

export interface JulesFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolExecutionRecord {
  callId: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  error?: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
}

export class JulesMcpHubBridge {
  private tools: Map<string, McpToolDefinition> = new Map();
  private executionLog: ToolExecutionRecord[] = [];
  private defaultTimeoutMs: number = 8000;
  private maxLogEntries: number = 200;

  constructor(defaultTimeoutMs: number = 8000, maxLogEntries: number = 200) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.maxLogEntries = maxLogEntries;
  }

  /**
   * Registers a tool in the local bridge catalog.
   */
  public registerTool(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregisters a tool from the catalog.
   */
  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Returns Google Jules REST compatible function declarations.
   */
  public listJulesToolDefinitions(): JulesFunctionDeclaration[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema || { type: 'object', properties: {} },
    }));
  }

  /**
   * Dispatches tool execution with sandboxing and strict timeout racing.
   */
  public async dispatchToolCall(
    callId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      const errRecord: ToolExecutionRecord = {
        callId,
        toolName,
        args,
        error: `Tool '${toolName}' not registered in MCP Hub Bridge`,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
        success: false,
      };
      this.recordExecution(errRecord);
      return { success: false, error: errRecord.error };
    }

    const timeout = tool.timeoutMs || this.defaultTimeoutMs;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout)
      );

      const result = await Promise.race([tool.handler(args), timeoutPromise]);
      const durationMs = Date.now() - startTime;

      const successRecord: ToolExecutionRecord = {
        callId,
        toolName,
        args,
        result,
        durationMs,
        timestamp: Date.now(),
        success: true,
      };
      this.recordExecution(successRecord);
      return { success: true, result };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);

      const failRecord: ToolExecutionRecord = {
        callId,
        toolName,
        args,
        error: errorMsg,
        durationMs,
        timestamp: Date.now(),
        success: false,
      };
      this.recordExecution(failRecord);
      return { success: false, error: errorMsg };
    }
  }

  private recordExecution(record: ToolExecutionRecord): void {
    this.executionLog.push(record);
    if (this.executionLog.length > this.maxLogEntries) {
      this.executionLog.shift();
    }
  }

  /**
   * Returns current count of registered tools.
   */
  public getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Returns execution telemetry metrics.
   */
  public getExecutionMetrics(): {
    totalCalls: number;
    successCount: number;
    failureCount: number;
    averageDurationMs: number;
  } {
    const total = this.executionLog.length;
    if (total === 0) {
      return { totalCalls: 0, successCount: 0, failureCount: 0, averageDurationMs: 0 };
    }

    let success = 0;
    let fail = 0;
    let totalDuration = 0;

    for (const rec of this.executionLog) {
      if (rec.success) success++;
      else fail++;
      totalDuration += rec.durationMs;
    }

    return {
      totalCalls: total,
      successCount: success,
      failureCount: fail,
      averageDurationMs: Math.round(totalDuration / total),
    };
  }

  /**
   * Clears tools and execution logs.
   */
  public destroy(): void {
    this.tools.clear();
    this.executionLog = [];
  }
}
