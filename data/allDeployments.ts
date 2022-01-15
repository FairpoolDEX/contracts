import { Deployment, DeploymentSchema, getDeploymentUid } from '../models/Deployment'
import { getFinder, getInserter } from '../util/zod'
import { BullToken } from '../models/ContractName'

export const allDeployments: Deployment[] = []

export const addDeployment = getInserter('Deployment', DeploymentSchema, getDeploymentUid, allDeployments)

export const findDeployment = getFinder(getDeploymentUid, allDeployments)

addDeployment({
  contract: 'ShieldToken',
  network: 'mainnet',
  address: '0xd49EFA7BC0D339D74f487959C573d518BA3F8437',
})

addDeployment({
  contract: 'BullToken',
  network: 'mainnet',
  address: '0x1bb022ab668085c6417b7d7007b0fbd53bacc383',
})
