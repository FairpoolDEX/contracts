import { Fairpool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { MaxUint256 } from '../../libs/ethereum/constants'

export async function buy(fairpool: Fairpool, signer: SignerWithAddress, quoteDeltaProposed: BigNumber) {
  return fairpool.connect(signer).buy(0, MaxUint256, { value: quoteDeltaProposed })
}

export async function sell(fairpool: Fairpool, signer: SignerWithAddress, baseDeltaProposed: BigNumber) {
  return fairpool.connect(signer).sell(baseDeltaProposed, 0, MaxUint256)
}

export async function getBalances(fairpool: Fairpool, signer: SignerWithAddress) {
  return {
    base: await fairpool.balanceOf(signer.address),
    quote: await signer.getBalance(),
  }
}
