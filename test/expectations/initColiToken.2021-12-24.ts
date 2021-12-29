import { toTokenAmount } from '../support/all.helpers'

export const expectations = {
  equalBalances: [
    '0x7dcbefb3b9a12b58af8759e0eb8df05656db911d',
  ],
  balances: {
    '0xc77aab3c6d7dab46248f3cc3033c856171878bd5': toTokenAmount('0'),
  },
}
