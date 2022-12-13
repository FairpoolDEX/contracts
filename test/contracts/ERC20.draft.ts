import { ERC20EnumerableModel } from './ERC20Enumerable/ERC20EnumerableModel'
import { sumAmountBNs } from '../../libs/ethereum/models/AmountBN/sumAmountBNs'

type Data = ERC20EnumerableModel

const Transfer = {
  name: 'transfer',
  args: [
    {
      name: 'sender',
      typeName: 'Address',
    },
    {
      name: 'to',
      typeName: 'Address',
    },
    {
      name: 'amount',
      typeName: 'Uint256',
    },
  ],
}

type PredicateName = null

const totalSupply = (data: Data) => sumAmountBNs(data.balances)

const projections = [
  totalSupply,
]

const MustRevertIfNotEnoughBalance: PredicateName = null
const MustChangeTotalSupplyOnlyAfterMintOrBurn: PredicateName = null

const predicates = [

]
