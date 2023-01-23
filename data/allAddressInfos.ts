import { AddressInfo, AddressInfoSchema, getAddressInfoUid, toAddressInfoUid } from '../models/AddressInfo'
import { getFinder, getInserter } from '../utils/zod'
import { ensure } from '../utils/ensure'
import { NetworkName } from '../libs/ethereum/models/NetworkName'
import { Address } from '../models/Address'
import { AddressType } from '../models/AddressType'

export const allAddressInfos: AddressInfo[] = []

export const addAddressInfo = getInserter('AddressInfo', AddressInfoSchema, getAddressInfoUid, allAddressInfos)

export const allAddressInfosByUid: Record<string, AddressInfo> = Object.fromEntries(allAddressInfos.map(info => [getAddressInfoUid(info), info]))

export const findAddressInfo = getFinder(getAddressInfoUid, allAddressInfos)

export function getAddressType(networkName: NetworkName, address: Address): AddressType {
  const uid = toAddressInfoUid(networkName, address)
  return ensure(allAddressInfosByUid[uid], async () => new Error(`Can't find addressInfo for ${uid}`)).type
}
