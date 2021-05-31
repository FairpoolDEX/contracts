import { ethers } from "hardhat"
import execa from "execa"

type timeTravelCallback = () => Promise<void>;

export async function timeTravel(callback: timeTravelCallback, newBlockTimestamp: number): Promise<void> {
  // save snapshot to rollback after calling callback
  const snapshot = await ethers.provider.send("evm_snapshot", [])
  // set new block timestamp
  await ethers.provider.send("evm_setNextBlockTimestamp", [newBlockTimestamp])
  // mine new block to really shift time
  await ethers.provider.send("evm_mine", [])
  await callback()
  // revert snapshot and come back in time to start point
  await ethers.provider.send("evm_revert", [snapshot])
  // mine new block to really shift time
}

export async function skipBlocks(amount: number): Promise<void> {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < amount; i += 1) {
    await ethers.provider.send("evm_mine", [])
  }
  /* eslint-enable no-await-in-loop */
}

export const hh = function(args?: readonly string[], options?: execa.Options): execa.ExecaChildProcess {
  return execa(`${__dirname}/../../node_modules/.bin/hardhat`, args, options)
}
