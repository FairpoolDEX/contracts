import { Decimal } from 'decimal.js'
import { toTokenAmount } from '../support/all.helpers'
import { maxSupplyTokenAmount } from '../support/ColiToken.helpers'
import { airdropRate } from '../support/BullToken.helpers'
import { SetClaimsExpectationsMap } from '../../tasks/setClaimsTask'
import { CS, KS, NFTradePool, oldDeployer, TeamFinanceLiquidityLocker } from '../../data/allAddresses'

export const expectations: SetClaimsExpectationsMap = {
  balances: {
    [TeamFinanceLiquidityLocker]: toTokenAmount('0'), // locked liquidity
    [NFTradePool]: toTokenAmount('0'), // NFTrade pool
    [oldDeployer]: toTokenAmount( // Deployer
      new Decimal('0')
        .add(new Decimal('193117719.000000000000000000')) // prev balance
        .add(new Decimal('13685263.953164100000000000')) // prev liquidity pool
        // .add(new Decimal("5384238888.888888888888888888")) // 10% BULL
        .add(new Decimal('538423800.000000000000000000')) // 10% BULL
        .add(new Decimal('0')
          .add(new Decimal('191158366.000000000000000000')) // curr balance
          .add(new Decimal('20118008.646713800000000000')) // curr liquidity pool
          .mul(3),),
    ),
    '0x3aff228382d3D6a420f065DC87459557b4646ee1': toTokenAmount('0'), // BULL seller
    '0x0D2Be688Cb203Ee577B6bABbf84B933961497128': toTokenAmount('0'), // BULL seller
    [CS]: toTokenAmount( // Stylo
      new Decimal('0')
        .add(new Decimal('1090600.19751302')) // prev balance
        .add(new Decimal('17790.000000000000000000')) // prev liquidity pool
        .add(new Decimal('0')
          .add(new Decimal('90600.1975130237')) // curr balance
          .add(new Decimal('17790.000000000000000000')) // curr liquidity pool
          .add(new Decimal('1000000')) // curr NFTrade
          .mul(3),),
    ),
    [KS]: toTokenAmount( // winooze
      new Decimal('0')
        .add(new Decimal('19418.000000000000000000')) // prev balance
        .add(new Decimal('0')
          .add(new Decimal('86168.000000000000000000')) // curr balance
          .mul(3),),
    ),
  },
  // min: maxSupplyTokenAmount.mul(airdropRate).mul(airdropStageShareNumerator).div(airdropStageShareDenominator),
  totalAmount: maxSupplyTokenAmount.mul(airdropRate),
}
