import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Fairpool } from '../../../typechain-types'
import { getSnapshot, revertToSnapshot } from '../../support/test.helpers'
import { MaxUint256 } from '../../../libs/ethereum/constants'
import { bn } from '../../../libs/bn/utils'
import { getQuoteAmountMin } from '../../support/Fairpool.helpers'
import { mapAsync } from '../../../libs/utils/promise'
import { range } from 'lodash'
import { ethers } from 'hardhat'
import { DefaultScale } from '../../../libs/fairpool/constants'

export const getGasUsedForManyHolders = async (fairpool: Fairpool, signer: SignerWithAddress, maxHoldersCount: number) => {
  const snapshot = await getSnapshot()
  const speed = await fairpool.speed()
  const balanceQuoteTotal = await signer.getBalance()
  const fairpoolAsSigner = fairpool.connect(signer)
  const buyTx = await fairpoolAsSigner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, DefaultScale)) })
  const balanceBaseBeforeTransfers = await fairpoolAsSigner.balanceOf(signer.address)
  const balanceBaseMinForSell = DefaultScale.mul(2)
  const balanceBaseForTransfers = balanceBaseBeforeTransfers.sub(balanceBaseMinForSell)
  const transferAmount = balanceBaseForTransfers.div(maxHoldersCount)
  const sendTxes = await mapAsync(range(0, maxHoldersCount), async i => {
    const wallet = ethers.Wallet.createRandom()
    // preload the address with ETH to reduce the gas cost of send() in distribute()
    // await signer.sendTransaction({
    //   to: wallet.address,
    //   value: 1,
    // })
    return fairpoolAsSigner.transfer(wallet.address, transferAmount)
  })
  const sellTx = await fairpoolAsSigner.sell(balanceBaseMinForSell, 0, MaxUint256)
  const sellTxReceipt = await sellTx.wait(1)
  // console.log('sellTxReceipt', sellTxReceipt.gasUsed.toString())
  await revertToSnapshot([snapshot])
  return sellTxReceipt.gasUsed
}
