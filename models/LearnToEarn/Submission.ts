import { z } from 'zod'
import { getDuplicatesRefinement } from '../../utils/zod'
import { AddressSchema } from '../Address'

export const SubmissionSchema = z.object({
  playerAddress: AddressSchema,
  leaderAddress: AddressSchema,
})

export const SubmissionsSchema = z.array(SubmissionSchema)
  .superRefine(getDuplicatesRefinement('Submission', parseSubmissionUid))

export const SubmissionUidSchema = SubmissionSchema.pick({
  playerAddress: true,
})

export type Submission = z.infer<typeof SubmissionSchema>

export type SubmissionUid = z.infer<typeof SubmissionUidSchema>

export function parseSubmission(submission: Submission): Submission {
  return SubmissionSchema.parse(submission)
}

export function parseSubmissions(submissions: Submission[]): Submission[] {
  return SubmissionsSchema.parse(submissions)
}

export function parseSubmissionUid(submissionUid: SubmissionUid): SubmissionUid {
  return SubmissionUidSchema.parse(submissionUid)
}
