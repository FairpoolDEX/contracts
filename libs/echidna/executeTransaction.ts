import { Contract } from 'ethers'
import { TransactionInfo } from './models/TransactionInfo'
import { show } from '../utils/debug'
import { stringifyTransaction } from './stringifyTransaction'
import { ensureFind } from '../utils/ensure'
import { CallOverrides } from '@ethersproject/contracts/src.ts/index'
import { ContractTransaction } from '@ethersproject/contracts'
import { renderLogDescription } from '../../utils-local/ethers/renderLogDescription'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

export const executeTransaction = (contract: Contract, signers: SignerWithAddress[]) => async (info: TransactionInfo) => {
  const { caller, name, args, value, origin } = info
  show('\n' + stringifyTransaction(info))
  const signer = ensureFind(signers, s => s.address === caller)
  const context = contract.connect(signer)
  const overrides: CallOverrides = { value }
  const argsWithOverrides = [...args, overrides]
  // hack to allow calling arbitrary functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaction = await (context[name] as any).apply(context, argsWithOverrides) as ContractTransaction
  const receipt = await transaction.wait(1) // TODO: the block number will be incremented, so "Block delay" will not work as intended. However, we want to preserve the order of console.log's, so we want to wait here
  const logs = receipt.logs.map(l => contract.interface.parseLog(l))
  show(logs.map(renderLogDescription))
  return { info, transaction, receipt, logs }
}
