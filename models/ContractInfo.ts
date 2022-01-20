import { z } from 'zod'
import { ContractTypeSchema } from './ContractType'
import { NetworkVMTypeSchema } from './NetworkVM'
import { toUid } from '../util/uid'
import { ContractCodeSchema } from './ContractCode'

export const ContractInfoSchema = z.object({
  vm: NetworkVMTypeSchema,
  code: ContractCodeSchema,
  type: ContractTypeSchema,
  notes: z.string().optional(),
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
  return toUid(info, 'vm', 'code')
}
