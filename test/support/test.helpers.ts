import { ethers } from "hardhat"
import execa from "execa"
import { BigNumber, BigNumberish, Contract } from "ethers"
import { string } from "hardhat/internal/core/params/argumentTypes"
import { MaxUint256 } from "./all.helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "../../util/expect"

export const zero = "0x0000000000000000000000000000000000000000"

type timeTravelCallback = () => Promise<void>;

export async function timeTravel(callback: timeTravelCallback, nextBlockTimestamp: number): Promise<void> {
  // save snapshot to rollback after calling callback
  const snapshot = await getSnapshot()
  // set new block timestamp
  await setNextBlockTimestamp(nextBlockTimestamp)
  // mine new block to really shift time
  await ethers.provider.send("evm_mine", [])
  await callback().finally(async () => {
    // revert snapshot and come back in time to start point
    // mine new block to really shift time
    return revertToSnapshot([snapshot])
  })
}

export async function skipBlocks(amount: number): Promise<void> {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < amount; i += 1) {
    await ethers.provider.send("evm_mine", [])
  }
  /* eslint-enable no-await-in-loop */
}

export async function getLatestBlock() {
  return ethers.provider.getBlock("latest")
}

export async function getLatestBlockTimestamp() {
  return (await getLatestBlock()).timestamp
}

export async function getSnapshot(params: any[] = []) {
  return ethers.provider.send("evm_snapshot", params)
}

export async function revertToSnapshot(params: any[] = []) {
  return ethers.provider.send("evm_revert", params)
}

export async function setNextBlockTimestamp(timestamp: number) {
  return ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
}

export async function expectBalances(balances: [SignerWithAddress, Contract, BigNumberish][]) {
  return Promise.all(balances.map(async ([signer, token, amount], index: number) => {
    expect(await token.balanceOf(signer.address), `index ${index}`).to.equal(amount)
  }))
}

export const hh = function(args?: readonly string[], options?: execa.Options): execa.ExecaChildProcess {
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
