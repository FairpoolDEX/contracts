import { z } from 'zod'
import { AddressTypeSchema } from './AddressType'
import { NetworkVMTypeSchema } from './NetworkVM'
import { toUidSimple } from '../util/uid'
import { Ethers } from '../util/types'
import { impl } from '../util/todo'

export const ContractInfoSchema = z.object({
  vm: NetworkVMTypeSchema,
  code: z.string(),
  type: AddressTypeSchema,
})

export type ContractInfo = z.infer<typeof ContractInfoSchema>

// function getUidField<T>(keys: Array<keyof T>) {
//   return z.union(keys.map(k => z.literal(k as string)))
// }

// export const ContractInfoUidField = getUidField<ContractInfo>(['vm', 'code'])

export function validateContractInfo(info: ContractInfo) {
  return ContractInfoSchema.parse(info)
}

export function getContractInfoUid(info: Pick<ContractInfo, 'vm' | 'code'>): string {
  return toUidSimple(info, 'vm', 'code')
}

export async function getContractCode(address: string, ethers: Ethers): Promise<string> {
  throw impl()
}

export async function isContract(address: string, ethers: Ethers): Promise<boolean> {
  throw impl()
}
