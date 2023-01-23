import { ContractTransaction, Overrides } from 'ethers'

interface PausableContract {
  pause(
    status: boolean,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;
}

export async function pauseContract(contract: PausableContract, status: boolean) {
  return contract.pause(status)
}
