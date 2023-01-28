import { Contract } from 'ethers'

export async function getContractBalance(contract: Contract) {
  return contract.provider.getBalance(contract.address)
}
