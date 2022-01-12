import { z } from 'zod'
import { NetworkNameSchema } from './NetworkName'
import { NetworkVMTypeSchema } from './NetworkVM'
import { toUid } from '../util/uid'

export const NetworkSchema = z.object({
  name: NetworkNameSchema,
  vm: NetworkVMTypeSchema,
})

export type Network = z.infer<typeof NetworkSchema>

export function validateNetwork(network: Network) {
  return NetworkSchema.parse(network)
}

export function getNetworkUid(network: Pick<Network, 'name'>): string {
  return toUid(network, 'name')
}
