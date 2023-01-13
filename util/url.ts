import { Address } from '../models/Address'
import { ContractTransaction, Signer } from 'ethers'
import { getNetworkFromSigner } from '../util-local/network'
import { ensure } from './ensure'
import { findNetworkExplorer } from '../libs/ethereum/data/allNetworkExplorers'

export async function getProxyCheckerUrl(address: Address, signer: Signer) {
  const network = await getNetworkFromSigner(signer)
  const networkExplorer = ensure(findNetworkExplorer(network))
  return `${networkExplorer.url}/proxyContractChecker?a=${address}`
}

export async function getTransactionUrl(transaction: ContractTransaction, signer: Signer) {
  const network = await getNetworkFromSigner(signer)
  const networkExplorer = ensure(findNetworkExplorer(network))
  return `${networkExplorer.url}/tx/${transaction.hash}`
}
