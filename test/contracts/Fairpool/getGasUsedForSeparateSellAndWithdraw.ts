import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Fairpool } from '../../../typechain-types'
import { getSnapshot, revertToSnapshot } from '../../support/test.helpers'
import { MaxUint256 } from '../../../libs/ethereum/constants'
import { QuoteScale } from '../../../libs/fairpool/constants'

export const getGasUsedForSeparateSellAndWithdraw = async (signer: SignerWithAddress, fairpool: Fairpool) => {
  const snapshot = await getSnapshot()
  const balanceQuoteTotal = await signer.getBalance()
  const fairpoolAsSigner = fairpool.connect(signer)
  const buyTx = await fairpoolAsSigner.buy(0, MaxUint256, { value: QuoteScale })
  const balance = await fairpoolAsSigner.balanceOf(signer.address)
  const sellTx = await fairpoolAsSigner.sell(balance, 0, MaxUint256)
  const sellTxReceipt = await sellTx.wait(1)
  const withdrawTx = await fairpoolAsSigner.withdraw()
  const withdrawTxReceipt = await withdrawTx.wait(1)
  await revertToSnapshot([snapshot])
  return sellTxReceipt.gasUsed.add(withdrawTxReceipt.gasUsed)
}

// const getGasUsedForCombinedSellAndWithdraw = async () => {
//   snapshot = await getSnapshot()
//   const balanceQuoteTotal = await owner.getBalance()
//   const buyTx = await fairpoolAsOwner.buy(0, MaxUint256, { value: bn(1000).mul(getQuoteAmountMin(speed, scale)) })
//   const balance = await fairpoolAsOwner.balanceOf(owner.address)
//   const sellAndWithdrawTx = await fairpoolAsOwner.sellAndWithdraw(balance, 0, MaxUint256)
//   const sellAndWithdrawTxReceipt = await sellAndWithdrawTx.wait(1)
//   await revertToSnapshot([snapshot])
//   return sellAndWithdrawTxReceipt.gasUsed
// }
