import { AddressInfo, AddressInfoSchema, AddressType, getAddressInfoUid } from '../models/AddressInfo'
import { getInserter } from '../util/zod'
import { Address } from '../util/address'
import { ensure } from '../util/ensure'
import allAddressInfosJSON from './raw/allAddressInfos.json'

export const allAddressInfos: AddressInfo[] = []

export const addAddressInfo = getInserter('AddressInfo', AddressInfoSchema, getAddressInfoUid, allAddressInfos)

const _ = (allAddressInfosJSON as unknown as AddressInfo[]).forEach(info => addAddressInfo(info))

export const allAddressInfosByAddress: Record<string, AddressInfo> = Object.fromEntries(allAddressInfos.map(info => [info.address, info]))

export function getAddressType(address: Address): AddressType {
  return ensure(allAddressInfosByAddress[address]).type
}
