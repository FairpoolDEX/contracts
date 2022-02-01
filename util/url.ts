import { Address } from '../models/Address'
import { Signer } from 'ethers'
import { getNetworkFromSigner } from './network'
import { ensure } from './ensure'
import { findNetworkExplorer } from '../data/allNetworkExplorers'

export async function getProxyCheckerUrl(address: Address, signer: Signer) {
  const network = await getNetworkFromSigner(signer)
  const networkExplorer = ensure(findNetworkExplorer(network))
  return `${networkExplorer.url}/proxyContractChecker?a=${address}`
}
