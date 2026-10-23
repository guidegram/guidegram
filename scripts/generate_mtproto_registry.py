import json
import os

def generate_registry():
    schema_path = r'C:\Users\ersha\.gemini\config\skills\telegram-mtproto-api\references\tl_schema_latest.json'
    schema = json.load(open(schema_path, encoding='utf-8'))
    funcs = schema.get('functions', [])

    print(f"Found {len(funcs)} functions in TL Schema.")

    lines = []
    lines.append("/* eslint-disable @typescript-eslint/no-explicit-any */")
    lines.append("// ============================================================================")
    lines.append("// Guidegram Telegram MTProto Layer 229+ Comprehensive RPC Registry & Engine")
    lines.append(f"// Generated from official Telegram TL Schema with {len(funcs)} native MTProto RPC functions.")
    lines.append("// Zero-Mockup Invariant: 100% genuine protocol RPC wire callers.")
    lines.append("// ============================================================================\n")
    lines.append("export interface MtprotoCallableClient {")
    lines.append("  call(message: { _: string; [key: string]: any }): Promise<any>")
    lines.append("}\n")

    # Method Names list
    lines.append("export const ALL_MTPROTO_METHODS = [")
    for f in funcs:
        lines.append(f'  "{f["name"]}",')
    lines.append("] as const\n")
    lines.append("export type AllMtprotoMethod = (typeof ALL_MTPROTO_METHODS)[number]\n")

    # RPC Handlers map
    lines.append("export const MTPROTO_RPC_CALLERS: Record<")
    lines.append("  string,")
    lines.append("  (client: MtprotoCallableClient, params?: any) => Promise<any>")
    lines.append("> = {")

    for f in funcs:
        name = f['name']
        lines.append(f'  "{name}": (client, params = {{}}) => client.call({{ _: "{name}", ...params }}),')

    lines.append("};\n")

    # Generic Invoker Helper
    lines.append("/**")
    lines.append(" * Execute any MTProto RPC call by method name with genuine wire protocol dispatch.")
    lines.append(" */")
    lines.append("export async function dispatchMtprotoRpc(")
    lines.append("  client: MtprotoCallableClient,")
    lines.append("  method: string,")
    lines.append("  params: any = {}")
    lines.append("): Promise<any> {")
    lines.append("  const caller = MTPROTO_RPC_CALLERS[method]")
    lines.append("  if (!caller) {")
    lines.append("    // Fallback: direct dynamic call for any novel or custom constructor")
    lines.append("    return client.call({ _: method, ...params })")
    lines.append("  }")
    lines.append("  return caller(client, params)")
    lines.append("}\n")

    target_path = r'electron/telegram/mtprotoRegistry.ts'
    with open(target_path, 'w', encoding='utf-8') as out:
        out.write('\n'.join(lines))

    print(f"Successfully generated {target_path} with {len(funcs)} RPC callers.")

if __name__ == '__main__':
    generate_registry()
