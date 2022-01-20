import { Deployment, DeploymentSchema, getDeploymentUid } from '../models/Deployment'
import { getFinder, getInserter } from '../util/zod'
import { BullToken } from '../models/ContractName'
import { nail } from '../util/string'

export const allDeployments: Deployment[] = []

export const addDeployment = getInserter('Deployment', DeploymentSchema, getDeploymentUid, allDeployments)

export const findDeployment = getFinder(getDeploymentUid, allDeployments)

export const ShieldMainnet = addDeployment({
  contract: 'ShieldToken',
  network: 'mainnet',
  address: '0xd49EFA7BC0D339D74f487959C573d518BA3F8437',
})

addDeployment({
  contract: 'BullToken',
  network: 'mainnet',
  address: '0x1Bb022aB668085C6417B7d7007b0fbD53bACc383',
})

addDeployment({
  contract: 'BullToken',
  network: 'bsctestnet',
  address: '0x7F606081f67fb119387C3300d2B7a4B51be0b199',
  notes: nail(`
    export BULL_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
    export BULL_TOKEN_PROXY_ADDRESS=0x7F606081f67fb119387C3300d2B7a4B51be0b199
    export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0xc378C2d780bf8583CdeC91a0292E3B2B1894F19e
  `),
})
