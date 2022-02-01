import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { getDuplicatesRefinement } from '../util/zod'
import { NetworkNameSchema } from './NetworkName'

export const NetworkExplorerSchema = z.object({
  name: NetworkNameSchema,
  url: z.string().url().min(1),
})

export const NetworkExplorersSchema = z.array(NetworkExplorerSchema)
  .superRefine(getDuplicatesRefinement('NetworkExplorer', getNetworkExplorerUid))

export const NetworkExplorerUidSchema = NetworkExplorerSchema.pick({
  name: true,
})

export type NetworkExplorer = z.infer<typeof NetworkExplorerSchema>

export type NetworkExplorerUid = z.infer<typeof NetworkExplorerUidSchema>

export function validateNetworkExplorer(explorer: NetworkExplorer): NetworkExplorer {
  return NetworkExplorerSchema.parse(explorer)
}

export function validateNetworkExplorers(explorers: NetworkExplorer[]): NetworkExplorer[] {
  return NetworkExplorersSchema.parse(explorers)
}

export function getNetworkExplorerUid(networkExplorerUid: NetworkExplorerUid): Uid {
  return toUidFromSchema(networkExplorerUid, NetworkExplorerUidSchema)
}
