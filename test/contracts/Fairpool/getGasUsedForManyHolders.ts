import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Fairpool } from '../../../typechain-types'
import { getSnapshot, revertToSnapshot } from '../../support/test.helpers'
import { MaxUint256 } from '../../../libs/ethereum/constants'
import { bn, getShare } from '../../../libs/bn/utils'
import { mapAsync } from '../../../libs/utils/promise'
import { range } from 'lodash'
import { ethers } from 'hardhat'
import { quoteDeltaMinStatic } from '../../support/Fairpool.helpers'

export const getGasUsedForManyHolders = async (fairpool: Fairpool, signer: SignerWithAddress, maxHoldersCount: number) => {
  const snapshot = await getSnapshot()
  const balanceQuoteTotal = await signer.getBalance()
  const fairpoolAsSigner = fairpool.connect(signer)
  const buyTx = await fairpoolAsSigner.buy(0, MaxUint256, { value: bn(1000).mul(quoteDeltaMinStatic) })
  const balanceBaseBeforeTransfers = await fairpoolAsSigner.balanceOf(signer.address)
  const balanceBaseMinForSell = getShare(balanceBaseBeforeTransfers, 1, 100)
  const balanceBaseForTransfers = balanceBaseBeforeTransfers.sub(balanceBaseMinForSell)
  const transferAmount = balanceBaseForTransfers.div(maxHoldersCount)
  const sendTxes = await mapAsync(range(0, maxHoldersCount), async i => {
    const wallet = ethers.Wallet.createRandom()
    return fairpoolAsSigner.transfer(wallet.address, transferAmount)
  })
  const balanceBaseAfterTransfers = await fairpoolAsSigner.balanceOf(signer.address)
  const sellTx = await fairpoolAsSigner.sell(balanceBaseMinForSell, 0, MaxUint256)
  const sellTxReceipt = await sellTx.wait(1)
  // console.log('sellTxReceipt', sellTxReceipt.gasUsed.toString())
  await revertToSnapshot([snapshot])
  return sellTxReceipt.gasUsed
}
