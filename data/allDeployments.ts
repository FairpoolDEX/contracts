import { Deployment, DeploymentSchema, parseDeploymentUid } from '../models/Deployment'
import { getFinder, getInserter } from '../utils/zod'
import { BullToken } from '../models/ContractName'
import { nail } from '../libs/utils/string'

export const allDeployments: Deployment[] = []

export const addDeployment = getInserter('Deployment', DeploymentSchema, parseDeploymentUid, allDeployments)

export const findDeployment = getFinder(parseDeploymentUid, allDeployments)

export const ColiMainnet = addDeployment({
  contract: 'ColiToken',
  network: 'mainnet',
  address: '0xd49EFA7BC0D339D74f487959C573d518BA3F8437',
})

export const ColiRopsten = addDeployment({
  contract: 'ColiToken',
  network: 'ropsten',
  address: '0x60bEe47CD5e37496f7acc7ece76f92Ed664b4416',
  notes: nail(`
    export SHIELD_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
    export SHIELD_TOKEN_PROXY_ADDRESS=0x60bEe47CD5e37496f7acc7ece76f92Ed664b4416
    export SHIELD_TOKEN_IMPLEMENTATION_ADDRESS=0xD75158c70BD9a15c61DE394AA2c81F621eEd6866
  `),
})

addDeployment({
  contract: 'BullToken',
  network: 'mainnet',
  address: '0x1Bb022aB668085C6417B7d7007b0fbD53bACc383',
})

addDeployment({
  contract: 'BullToken',
  network: 'bnbmainnet',
  address: '0xEFB7311cc5d66b19FeD6a19148A3Ecf801e65100',
  notes: nail(`
    # ProxyAdmin ownership has been changed to newHardwareDeployer
    export BULL_TOKEN_DEPLOYER=0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D
    export BULL_TOKEN_PROXY_ADMIN_ADDRESS=0xd197ABdd388f63ce3401dE64CE6794FFFFBF1E30
    export BULL_TOKEN_PROXY_ADDRESS=0xEFB7311cc5d66b19FeD6a19148A3Ecf801e65100
    export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0x3707ac9Ecf32ac683E31aD625D78772Ed113D664
  `),
})

// /**
//  * oldSoftwareDeployer
//  * Unclaimed
//  */
// addDeployment({
//   contract: 'BullToken',
//   network: 'bnbtestnet',
//   address: '0x4c18040E8E28F2B15d3C936AE81Fca91A22791ba',
// })
//
// /**
//  * newSoftwareDeployer
//  * Unclaimed
//  */
// addDeployment({
//   contract: 'BullToken',
//   network: 'bnbtestnet',
//   address: '0x7F606081f67fb119387C3300d2B7a4B51be0b199',
//   notes: nail(`
//     export BULL_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
//     export BULL_TOKEN_PROXY_ADDRESS=0x7F606081f67fb119387C3300d2B7a4B51be0b199
//     export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0xc378C2d780bf8583CdeC91a0292E3B2B1894F19e
//   `),
// })
//
// addDeployment({
//   contract: 'BullToken',
//   network: 'bnbtestnet',
//   address: '0xf90f44fB0896367242724EbF1BA9e523FD907120',
//   notes: nail(`
//     export BULL_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
//     export BULL_TOKEN_PROXY_ADDRESS=0xf90f44fB0896367242724EbF1BA9e523FD907120
//     export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0xaf510d7ADdb583E2e506DA660Bf49320600211ca
//   `),
// })

addDeployment({
  contract: 'BullToken',
  network: 'bnbtestnet',
  address: '0x40ACbf8b62b243faD9F50fbC2d8122Cc26ef2c12',
  notes: nail(`
    export BULL_TOKEN_DEPLOYER=0x64D0991Bcc3cD7B6dB859793Fe156704E372663D
    export BULL_TOKEN_PROXY_ADDRESS=0x40ACbf8b62b243faD9F50fbC2d8122Cc26ef2c12
    export BULL_TOKEN_IMPLEMENTATION_ADDRESS=0xaf510d7ADdb583E2e506DA660Bf49320600211ca
  `),
})
