import { ContractInfo, ContractInfoSchema, getContractInfoUid } from '../models/ContractInfo'
import { getFinder, getInserter } from '../util/zod'

export const allContractInfos: ContractInfo[] = []

export const addContractInfo = getInserter('ContractInfo', ContractInfoSchema, getContractInfoUid, allContractInfos)

export const findContractInfo = getFinder(getContractInfoUid, allContractInfos)
