import { z } from 'zod'

export const NativeTokenTypeSchema = z.enum(['SHLD', 'BULL'])

export type NativeTokenType = z.infer<typeof NativeTokenTypeSchema>

export const { SHLD, BULL } = NativeTokenTypeSchema.enum

export function validateNativeTokenType(type: NativeTokenType) {
  return NativeTokenTypeSchema.parse(type)
}
