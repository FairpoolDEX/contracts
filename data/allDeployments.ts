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
  network: 'bscmainnet',
  address: '0xEFB7311cc5d66b19FeD6a19148A3Ecf801e65100',
  notes: nail(`
    # NOTE: ProxyAdmin ownership has been changed to newHardwareDeployer
    export BULL_TOKEN_DEPLOYER=0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D
    export BULL_TOKEN_PROXY_ADMIN_ADDRESS=0xd197ABdd388f63ce3401dE64CE6794FFFFBF1E30
    export BULL_TOKEN_PROXY_ADDRESS=0xEFB7311cc5d66b19FeD6a19148A3Ecf801e65100
    export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0x3707ac9Ecf32ac683E31aD625D78772Ed113D664
  `),
})

// addDeployment({
//   contract: 'BullToken',
//   network: 'bsctestnet',
//   address: '0x7F606081f67fb119387C3300d2B7a4B51be0b199',
//   notes: nail(`
//     export BULL_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
//     export BULL_TOKEN_PROXY_ADDRESS=0x7F606081f67fb119387C3300d2B7a4B51be0b199
//     export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0xc378C2d780bf8583CdeC91a0292E3B2B1894F19e
//   `),
// })

/**
 * oldSoftwareDeployer
 */
addDeployment({
  contract: 'BullToken',
  network: 'bsctestnet',
  address: '0x4c18040E8E28F2B15d3C936AE81Fca91A22791ba',
})
