import { z } from 'zod'
import { getDuplicatesRefinement } from '../util/zod'
import { NetworkNameSchema } from './NetworkName'
import { NetworkVMTypeSchema } from './NetworkVM'

export const NetworkSchema = z.object({
  name: NetworkNameSchema,
  chainId: z.number().int().min(1),
  blockGasLimit: z.number().int().min(1000),
  vm: NetworkVMTypeSchema,
})

export const NetworksSchema = z.array(NetworkSchema)
  .superRefine(getDuplicatesRefinement('Network', parseNetworkUid))

export const NetworkUidSchema = NetworkSchema.pick({
  name: true,
})

export type Network = z.infer<typeof NetworkSchema>

export type NetworkUid = z.infer<typeof NetworkUidSchema>

export function parseNetwork(network: Network): Network {
  return NetworkSchema.parse(network)
}

export function parseNetworks(networks: Network[]): Network[] {
  return NetworksSchema.parse(networks)
}

export function parseNetworkUid(networkUid: NetworkUid): NetworkUid {
  return NetworkUidSchema.parse(networkUid)
}
