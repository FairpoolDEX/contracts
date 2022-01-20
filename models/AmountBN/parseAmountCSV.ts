import { utils } from 'ethers'
import { strict as assert } from 'assert'
import { trimEnd } from 'lodash'

export function parseAmountCSV(amountRaw: string) {
  const amountParsed = utils.parseUnits(amountRaw, 18)
  assert.equal(trimEnd(utils.formatUnits(amountParsed, 18), '0'), trimEnd(amountRaw, '0'), 'Can\'t parse balance')
  return amountParsed
}
