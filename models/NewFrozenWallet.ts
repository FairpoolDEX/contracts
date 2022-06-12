import { BigNumber } from 'ethers'

export interface NewFrozenWallet {
  wallet: string;
  totalAmount: BigNumber;
  dailyAmount: BigNumber;
  monthlyAmount: BigNumber;
  initialAmount: BigNumber;
  lockDaysPeriod: BigNumber;
  scheduled: boolean;
}
