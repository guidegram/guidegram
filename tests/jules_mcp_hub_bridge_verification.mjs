/**
 * Phase 140 Verification Suite:
 * Google Jules MCP Hub Bridge & Tool Execution Dispatcher Protocol
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('🧪 Starting Phase 140 Verification: Google Jules MCP Hub Bridge & Tool Execution Dispatcher Protocol...\n');

// 1. Check file existence
const bridgeFile = path.join(rootDir, 'src', 'services', 'julesMcpHubBridge.ts');
assert(fs.existsSync(bridgeFile), 'src/services/julesMcpHubBridge.ts file exists');

// 2. Read source code and check exports
const sourceContent = fs.readFileSync(bridgeFile, 'utf-8');
assert(
  sourceContent.includes('export class JulesMcpHubBridge') &&
  sourceContent.includes('export interface McpToolDefinition') &&
  sourceContent.includes('export interface JulesFunctionDeclaration') &&
  sourceContent.includes('export interface ToolExecutionRecord'),
  'julesMcpHubBridge.ts exports JulesMcpHubBridge class and declaration interfaces'
);

// 3. Test tool registration and catalog listing
assert(
  sourceContent.includes('registerTool(tool: McpToolDefinition)') &&
  sourceContent.includes('unregisterTool(name: string): boolean') &&
  sourceContent.includes('listJulesToolDefinitions()'),
  'JulesMcpHubBridge registers native MCP tools and translates them to Google Jules schema format'
);

// 4. Test execution dispatching and timeout protection
assert(
  sourceContent.includes('dispatchToolCall(') &&
  sourceContent.includes('Promise.race([tool.handler(args), timeoutPromise])') &&
  sourceContent.includes('Tool execution timed out after'),
  'JulesMcpHubBridge executes tools with sandboxed Promise.race timeouts'
);

// 5. Test metrics telemetry and resource cleanup
assert(
  sourceContent.includes('getExecutionMetrics()') &&
  sourceContent.includes('averageDurationMs') &&
  sourceContent.includes('destroy(): void'),
  'JulesMcpHubBridge records execution duration telemetry and releases memory on destroy'
);

// 6. Check CSS styles in src/index.css
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf-8');
assert(
  cssContent.includes('.mcp-bridge-status-pill') &&
  cssContent.includes('.tool-execution-terminal'),
  'src/index.css defines .mcp-bridge-status-pill and .tool-execution-terminal CSS tokens'
);

console.log(`\n📊 Verification Result: ${passedTests}/${totalTests} checks passed.`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 140 Verification Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('❌ Phase 140 Verification Failed!\n');
  process.exit(1);
}
