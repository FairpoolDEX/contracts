import { ethers } from 'hardhat'
import execa from 'execa'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { MaxUint256 } from './all.helpers'
import { expect } from '../../util/expect'
import { Ethers } from '../../util/types'
import { Address } from '../../models/Address'

type timeTravelCallback = () => Promise<void>;

export async function timeTravel(callback: timeTravelCallback, nextBlockTimestamp: number): Promise<void> {
  // save snapshot to rollback after calling callback
  const snapshot = await getSnapshot()
  // set new block timestamp
  await setNextBlockTimestamp(nextBlockTimestamp)
  // mine new block to really shift time
  await ethers.provider.send('evm_mine', [])
  await callback().finally(async () => {
    // revert snapshot and come back in time to start point
    // mine new block to really shift time
    return revertToSnapshot([snapshot])
  })
}

export async function skipBlocks(amount: number): Promise<void> {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < amount; i += 1) {
    await ethers.provider.send('evm_mine', [])
  }
  /* eslint-enable no-await-in-loop */
}

export async function getLatestBlock(ethers: Ethers) {
  return ethers.provider.getBlock('latest')
}

export async function getLatestBlockTimestamp(ethers: Ethers) {
  return (await getLatestBlock(ethers)).timestamp
}

export async function getSnapshot(params: unknown[] = []) {
  return ethers.provider.send('evm_snapshot', params)
}

export async function revertToSnapshot(params: unknown[] = []) {
  return ethers.provider.send('evm_revert', params)
}

export async function setNextBlockTimestamp(timestamp: number) {
  return ethers.provider.send('evm_setNextBlockTimestamp', [timestamp])
}

export type Addressable = { address: Address }

export type AddressableBalance = [Addressable, Contract, BigNumberish]

export async function expectSignerBalances(balances: AddressableBalance[]) {
  return Promise.all(balances.map(async ([addressable, token, amount], index: number) => {
    expect(await token.balanceOf(addressable.address), `index ${index}`).to.equal(amount)
  }))
}

export async function expectSignerBalance(addressable: Addressable, token: Contract, amount: BigNumberish) {
  return expectBalance(token, addressable.address, amount)
}

export async function expectBalance(token: Contract, address: Address, amount: BigNumberish) {
  return expect(await token.balanceOf(address)).to.equal(amount)
}

export const hh = function (args?: readonly string[], options?: execa.Options): execa.ExecaChildProcess {
  return execa(`${__dirname}/../../node_modules/.bin/hardhat`, args, options)
}

export async function addLiquidity(router: Contract, token0: Contract, token1: Contract, token0Amount: BigNumber, token1Amount: BigNumber, LPTokensReceivingAddress: string, deadline = Number.MAX_SAFE_INTEGER): Promise<void> {
  await token0.approve(router.address, MaxUint256)
  await token1.approve(router.address, MaxUint256)
  await router.addLiquidity(
    token0.address,
    token1.address,
    token0Amount,
    token1Amount,
    token0Amount,
    token1Amount,
    LPTokensReceivingAddress,
    MaxUint256,
    deadline,
  )
}

export function logBn(label: string, value: unknown) {
  if (value instanceof BigNumber) {
    console.log(label, value.toString())
  } else if (typeof value === 'object' && value) {
    console.log(
      label,
      Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          if (BigNumber.isBigNumber(value)) {
            return [key, value.toString()]
          } else {
            return [key, value]
          }
        }),
      ),
    )
  } else {
    console.log(label, value)
  }
}
