import { commands, constant, constantFrom, record } from 'fast-check'
import { BuyCommand } from '../commands/BuyCommand'
import { contract } from '../../libs/fairpool/formulas/default'
import { quoteDeltaRawArb } from '../../libs/fairpool/formulas/arbitraries/quoteDeltaRawArb'
import { Address } from '../../libs/ethereum/models/Address'

export const commandsArb = (users: Address[]) => commands([
  record({
    contract: constant(contract),
    sender: constantFrom(...users),
    quoteDeltaProposed: quoteDeltaRawArb,
  }).map(({ contract, sender, quoteDeltaProposed }) => new BuyCommand(contract, sender, quoteDeltaProposed)),
])
