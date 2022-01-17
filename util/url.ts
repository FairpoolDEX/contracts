import { Address } from '../models/Address'
import { Signer } from 'ethers'

export function getProxyCheckerUrl(address: Address, signer: Signer) {
  // const network = ensure(findNetwork({ name: networkName }))
  return `https://\${explorerUrl}/proxyContractChecker?a=${address}`
}
