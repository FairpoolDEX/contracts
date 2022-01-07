import { getNetworkUid, Network, NetworkSchema } from '../models/Network'
import { getFinder, getInserter } from '../util/zod'

export const allNetworks: Network[] = []

export const addNetwork = getInserter('Network', NetworkSchema, getNetworkUid, allNetworks)

export const findNetwork = getFinder(getNetworkUid, allNetworks)

export const mainnet = addNetwork({
  name: 'mainnet',
  vm: 'EVM',
})
