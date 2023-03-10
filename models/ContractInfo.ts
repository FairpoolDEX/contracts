import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { getDuplicatesRefinement } from '../util/zod'
import { NetworkVMTypeSchema } from './NetworkVM'
import { ContractCodeSchema } from './ContractCode'
import { ContractTypeSchema } from './ContractType'

export const ContractInfoSchema = z.object({
  vm: NetworkVMTypeSchema,
  code: ContractCodeSchema,
  type: ContractTypeSchema,
  notes: z.string().optional(),
})

export const ContractInfosSchema = z.array(ContractInfoSchema)
  .superRefine(getDuplicatesRefinement('ContractInfo', getContractInfoUid))

export const ContractInfoUidSchema = ContractInfoSchema.pick({
  vm: true,
  code: true,
})

export type ContractInfo = z.infer<typeof ContractInfoSchema>

export type ContractInfoUid = z.infer<typeof ContractInfoUidSchema>

export function validateContractInfo(info: ContractInfo): ContractInfo {
  return ContractInfoSchema.parse(info)
}

export function validateContractInfos(infos: ContractInfo[]): ContractInfo[] {
  return ContractInfosSchema.parse(infos)
}

export function getContractInfoUid(infoUid: ContractInfoUid): Uid {
  return toUidFromSchema(infoUid, ContractInfoUidSchema)
}
