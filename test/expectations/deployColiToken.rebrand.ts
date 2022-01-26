import { validateDeployColiTokenExpectationsMap } from '../../tasks/deployColiTokenTask'
import { getBalancesFromMap } from '../../util/balance'
import { CS, KS, oldSoftwareDeployer } from '../../data/allAddresses'
import { bn } from '../../util/bignumber'
import { validateRawFrozenWallets } from '../../models/FrozenWallet'

export const expectations = validateDeployColiTokenExpectationsMap({
  balances: getBalancesFromMap({
    [oldSoftwareDeployer]: bn('189268918207660000002328306'),
    [CS]: bn('90600197513023672531491'),
    [KS]: bn('142868000000000000000000'),
  }),
  frozenWallets: validateRawFrozenWallets([
    {
      wallet: '0x53cC4422e3ADf3A75051D4D21069B704c46c91C6',
      totalAmount: '657895000000000000000000',
      monthlyAmount: '69444764620000000000000',
      initialAmount: '32894750000000000000000',
      lockDaysPeriod: 2592000,
    },
    {
      wallet: '0xeDB28Ab9B1b0ac1C37d01BCFB868580eFD20A8a4',
      totalAmount: '1219513000000000000000000',
      monthlyAmount: '182926950000000000000000',
      initialAmount: '121951300000000000000000',
      lockDaysPeriod: 0,
    },
    {
      wallet: '0x2d3be8E442bdeF1b263160fda6C86E560CE7E4Ad',
      totalAmount: '155066079000000000000000000',
      monthlyAmount: '3165984134943000000000000',
      initialAmount: '3101321580000000000000000',
      lockDaysPeriod: 7776000,
    },
  ]),
})
