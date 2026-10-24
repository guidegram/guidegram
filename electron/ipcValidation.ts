import { z } from 'zod'

export const BotAuthSchema = z.object({
  token: z.string().trim().min(5, 'Bot token is too short').max(256, 'Bot token is too long'),
  proxy: z.any().optional(),
})

export const PhoneAuthSchema = z.object({
  phone: z.string().trim().min(5, 'Phone number too short').max(32, 'Phone number too long'),
  proxy: z.any().optional(),
})

export const CompletePhoneAuthSchema = z.object({
  phone: z.string().trim().min(5).max(32),
  code: z.string().trim().min(1, 'Auth code is required').max(32),
  password: z.string().optional(),
})

export const AccountIdSchema = z.object({
  accountId: z.string().trim().min(1, 'Account ID is required').max(128),
})

export const SendMessageSchema = z.object({
  accountId: z.string().trim().min(1),
  chatId: z.string().trim().min(1),
  text: z.string().min(1, 'Message text cannot be empty').max(100000, 'Message text exceeds 100k limit'),
  replyToMsgId: z.number().optional(),
})

export function validateIpcPayload<T>(schema: z.ZodSchema<T>, payload: unknown, channelName: string): T {
  const result = schema.safeParse(payload)
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => `${i.path.join('.') || 'payload'}: ${i.message}`).join(', ')
    throw new Error(`[IPC-VALIDATION-ERROR] [${channelName}] Invalid input: ${errorMsg}`)
  }
  return result.data
}
