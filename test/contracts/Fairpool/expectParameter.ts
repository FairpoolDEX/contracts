import { Fairpool } from '../../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { expect } from '../../../util-local/expect'

type FairpoolParameterGetter = 'royalties' | 'dividends' | 'fees'
type FairpoolParameterSetter = 'setRoyalties' | 'setDividends' | 'setFees'

export async function expectParameter(contract: Fairpool, admin: SignerWithAddress, stranger: SignerWithAddress, getter: FairpoolParameterGetter, setter: FairpoolParameterSetter, valueNew: BigNumber, error: string, isCustomError: boolean) {
  const valueBefore = await contract[getter]()
  expect(valueBefore).not.to.equal(valueNew)
  const promise = contract.connect(stranger)[setter](valueNew)
  if (isCustomError) {
    await expect(promise).to.be.revertedWithCustomError(contract, error)
  } else {
    await expect(promise).to.be.revertedWith(error)
  }
  await contract.connect(admin)[setter](valueNew)
  const feesAfter = await contract[getter]()
  expect(feesAfter).to.equal(valueNew)
}
