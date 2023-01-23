import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { getDuplicatesRefinement } from '../utils/zod'
import { AddressSchema } from './Address'

export const RewriteSchema = z.object({
  from: AddressSchema,
  to: AddressSchema,
})

export const RewritesSchema = z.array(RewriteSchema)
  .superRefine(getDuplicatesRefinement('Rewrite', getRewriteUid))

export const RewriteUidSchema = RewriteSchema.pick({
  from: true,
  to: true,
})

export type Rewrite = z.infer<typeof RewriteSchema>

export type RewriteUid = z.infer<typeof RewriteUidSchema>

export function validateRewrite(rewrite: Rewrite): Rewrite {
  return RewriteSchema.parse(rewrite)
}

export function validateRewrites(rewrites: Rewrite[]): Rewrite[] {
  return RewritesSchema.parse(rewrites)
}

export function getRewriteUid(rewriteUid: RewriteUid): Uid {
  return toUidFromSchema(rewriteUid, RewriteUidSchema)
}
