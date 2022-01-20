import { ContractInfo, ContractInfoSchema, getContractInfoUid } from '../models/ContractInfo'
import { getFinder, getInserter } from '../util/zod'

export const allContractInfos: ContractInfo[] = []

export const addContractInfo = getInserter('ContractInfo', ContractInfoSchema, getContractInfoUid, allContractInfos)

export const findContractInfo = getFinder(getContractInfoUid, allContractInfos)

addContractInfo({
  vm: 'EVM',
  type: 'UniswapV2Pair',
  code: '0x608060405234801561001057600080fd5b50600436106101b95760003560e01c80636a627842116100f9578063ba9a7a5611610097578063d21220a711610071578063d21220a7146105da578063d505accf146105e2578063dd62ed3e14610640578063fff6cae91461067b576101b9565b8063ba9a7a5614610597578063bc25cf771461059f578063c45a0155146105d2576101b9565b80637ecebe00116100d35780637ecebe00146104d757806389afcb441461050a57806395d89b4114610556578063a9059cbb1461055e576101b9565b80636a6278421461046957806370a082311461049c5780637464fc3d146104cf576101b9565b806323b872dd116101665780633644e515116101405780633644e51514610416578063485cc9551461041e5780635909c0d5146104595780635a3d549314610461576101b9565b806323b872dd146103ad57806330adf81f146103f0578063313ce567146103f8576101b9565b8063095ea7b311610197578063095ea7b3146103155780630dfe16811461036257806318160ddd14610393576101b9565b8063022c0d9f146101be57806306fdde03146102595780630902f1ac146102d6575b600080fd5b610257600480360360808110156101d457600080fd5b81359160208101359173ffffffffffffffffffffffffffffffffffffffff604083013516919081019060808101606082013564010000000081111561021857600080fd5b82018360208201111561022a57600080fd5b8035906020019184600183028401116401000000008311171561024c57600080fd5b509092509050610683565b005b610261610d57565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561029b578181015183820152602001610283565b50505050905090810190601f1680156102c85780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6102de610d90565b604080516dffffffffffffffffffffffffffff948516815292909316602083015263ffffffff168183015290519081900360600190f35b61034e6004803603604081101561032b57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff8135169060200135610de5565b604080519115158252519081900360200190f35b61036a610dfc565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b61039b610e18565b60408051918252519081900360200190f35b61034e600480360360608110156103c357600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813581169160208101359091169060400135610e1e565b61039b610efd565b610400610f21565b6040805160ff9092168252519081900360200190f35b61039b610f26565b6102576004803603604081101561043457600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81358116916020013516610f2c565b61039b611005565b61039b61100b565b61039b6004803603602081101561047f57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16611011565b61039b600480360360208110156104b257600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166113cb565b61039b6113dd565b61039b600480360360208110156104ed57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166113e3565b61053d6004803603602081101561052057600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166113f5565b6040805192835260208301919091528051918290030190f35b610261611892565b61034e6004803603604081101561057457600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356118cb565b61039b6118d8565b610257600480360360208110156105b557600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166118de565b61036a611ad4565b61036a611af0565b610257600480360360e08110156105f857600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813581169160208101359091169060408101359060608101359060ff6080820135169060a08101359060c00135611b0c565b61039b6004803603604081101561065657600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81358116916020013516611dd8565b610257611df5565b600c546001146106f457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f556e697377617056323a204c4f434b4544000000000000000000000000000000604482015290519081900360640190fd5b6000600c55841515806107075750600084115b61075c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526025815260200180612b2f6025913960400191505060405180910390fd5b600080610767610d90565b5091509150816dffffffffffffffffffffffffffff168710801561079a5750806dffffffffffffffffffffffffffff1686105b6107ef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526021815260200180612b786021913960400191505060405180910390fd5b600654600754600091829173ffffffffffffffffffffffffffffffffffffffff91821691908116908916821480159061085457508073ffffffffffffffffffffffffffffffffffffffff168973ffffffffffffffffffffffffffffffffffffffff1614155b6108bf57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601560248201527f556e697377617056323a20494e56414c49445f544f0000000000000000000000604482015290519081900360640190fd5b8a156108d0576108d0828a8d611fdb565b89156108e1576108e1818a8c611fdb565b86156109c3578873ffffffffffffffffffffffffffffffffffffffff166310d1e85c338d8d8c8c6040518663ffffffff1660e01b8152600401808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001858152602001848152602001806020018281038252848482818152602001925080828437600081840152601f19601f8201169050808301925050509650505050505050600060405180830381600087803b1580156109aa57600080fd5b505af11580156109be573d6000803e3d6000fd5b505050505b604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905173ffffffffffffffffffffffffffffffffffffffff8416916370a08231916024808301926020929190829003018186803b158015610a2f57600080fd5b505afa158015610a43573d6000803e3d6000fd5b505050506040513d6020811015610a5957600080fd5b5051604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905191955073ffffffffffffffffffffffffffffffffffffffff8316916370a0823191602480820192602092909190829003018186803b158015610acb57600080fd5b505afa158015610adf573d6000803e3d6000fd5b505050506040513d6020811015610af557600080fd5b5051925060009150506dffffffffffffffffffffffffffff85168a90038311610b1f576000610b35565b89856dffffffffffffffffffffffffffff160383035b9050600089856dffffffffffffffffffffffffffff16038311610b59576000610b6f565b89856dffffffffffffffffffffffffffff160383035b90506000821180610b805750600081115b610bd5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526024815260200180612b546024913960400191505060405180910390fd5b6000610c09610beb84600363ffffffff6121e816565b610bfd876103e863ffffffff6121e816565b9063ffffffff61226e16565b90506000610c21610beb84600363ffffffff6121e816565b9050610c59620f4240610c4d6dffffffffffffffffffffffffffff8b8116908b1663ffffffff6121e816565b9063ffffffff6121e816565b610c69838363ffffffff6121e816565b1015610cd657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f556e697377617056323a204b0000000000000000000000000000000000000000604482015290519081900360640190fd5b5050610ce4848488886122e0565b60408051838152602081018390528082018d9052606081018c9052905173ffffffffffffffffffffffffffffffffffffffff8b169133917fd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d8229181900360800190a350506001600c55505050505050505050565b6040518060400160405280600a81526020017f556e69737761702056320000000000000000000000000000000000000000000081525081565b6008546dffffffffffffffffffffffffffff808216926e0100000000000000000000000000008304909116917c0100000000000000000000000000000000000000000000000000000000900463ffffffff1690565b6000610df233848461259c565b5060015b92915050565b60065473ffffffffffffffffffffffffffffffffffffffff1681565b60005481565b73ffffffffffffffffffffffffffffffffffffffff831660009081526002602090815260408083203384529091528120547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff14610ee85773ffffffffffffffffffffffffffffffffffffffff84166000908152600260209081526040808320338452909152902054610eb6908363ffffffff61226e16565b73ffffffffffffffffffffffffffffffffffffffff851660009081526002602090815260408083203384529091529020555b610ef384848461260b565b5060019392505050565b7f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c981565b601281565b60035481565b60055473ffffffffffffffffffffffffffffffffffffffff163314610fb257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f556e697377617056323a20464f5242494444454e000000000000000000000000604482015290519081900360640190fd5b6006805473ffffffffffffffffffffffffffffffffffffffff9384167fffffffffffffffffffffffff00000000000000000000000000000000000000009182161790915560078054929093169116179055565b60095481565b600a5481565b6000600c5460011461108457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f556e697377617056323a204c4f434b4544000000000000000000000000000000604482015290519081900360640190fd5b6000600c81905580611094610d90565b50600654604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905193955091935060009273ffffffffffffffffffffffffffffffffffffffff909116916370a08231916024808301926020929190829003018186803b15801561110e57600080fd5b505afa158015611122573d6000803e3d6000fd5b505050506040513d602081101561113857600080fd5b5051600754604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905192935060009273ffffffffffffffffffffffffffffffffffffffff909216916370a0823191602480820192602092909190829003018186803b1580156111b157600080fd5b505afa1580156111c5573d6000803e3d6000fd5b505050506040513d60208110156111db57600080fd5b505190506000611201836dffffffffffffffffffffffffffff871663ffffffff61226e16565b90506000611225836dffffffffffffffffffffffffffff871663ffffffff61226e16565b9050600061123387876126ec565b600054909150806112705761125c6103e8610bfd611257878763ffffffff6121e816565b612878565b985061126b60006103e86128ca565b6112cd565b6112ca6dffffffffffffffffffffffffffff8916611294868463ffffffff6121e816565b8161129b57fe5b046dffffffffffffffffffffffffffff89166112bd868563ffffffff6121e816565b816112c457fe5b0461297a565b98505b60008911611326576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526028815260200180612bc16028913960400191505060405180910390fd5b6113308a8a6128ca565b61133c86868a8a6122e0565b811561137e5760085461137a906dffffffffffffffffffffffffffff808216916e01000000000000000000000000000090041663ffffffff6121e816565b600b555b6040805185815260208101859052815133927f4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f928290030190a250506001600c5550949695505050505050565b60016020526000908152604090205481565b600b5481565b60046020526000908152604090205481565b600080600c5460011461146957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f556e697377617056323a204c4f434b4544000000000000000000000000000000604482015290519081900360640190fd5b6000600c81905580611479610d90565b50600654600754604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905194965092945073ffffffffffffffffffffffffffffffffffffffff9182169391169160009184916370a08231916024808301926020929190829003018186803b1580156114fb57600080fd5b505afa15801561150f573d6000803e3d6000fd5b505050506040513d602081101561152557600080fd5b5051604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905191925060009173ffffffffffffffffffffffffffffffffffffffff8516916370a08231916024808301926020929190829003018186803b15801561159957600080fd5b505afa1580156115ad573d6000803e3d6000fd5b505050506040513d60208110156115c357600080fd5b5051306000908152600160205260408120549192506115e288886126ec565b600054909150806115f9848763ffffffff6121e816565b8161160057fe5b049a5080611614848663ffffffff6121e816565b8161161b57fe5b04995060008b11801561162e575060008a115b611683576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526028815260200180612b996028913960400191505060405180910390fd5b61168d3084612992565b611698878d8d611fdb565b6116a3868d8c611fdb565b604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905173ffffffffffffffffffffffffffffffffffffffff8916916370a08231916024808301926020929190829003018186803b15801561170f57600080fd5b505afa158015611723573d6000803e3d6000fd5b505050506040513d602081101561173957600080fd5b5051604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905191965073ffffffffffffffffffffffffffffffffffffffff8816916370a0823191602480820192602092909190829003018186803b1580156117ab57600080fd5b505afa1580156117bf573d6000803e3d6000fd5b505050506040513d60208110156117d557600080fd5b505193506117e585858b8b6122e0565b811561182757600854611823906dffffffffffffffffffffffffffff808216916e01000000000000000000000000000090041663ffffffff6121e816565b600b555b604080518c8152602081018c9052815173ffffffffffffffffffffffffffffffffffffffff8f169233927fdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496929081900390910190a35050505050505050506001600c81905550915091565b6040518060400160405280600681526020017f554e492d5632000000000000000000000000000000000000000000000000000081525081565b6000610df233848461260b565b6103e881565b600c5460011461194f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f556e697377617056323a204c4f434b4544000000000000000000000000000000604482015290519081900360640190fd5b6000600c55600654600754600854604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905173ffffffffffffffffffffffffffffffffffffffff9485169490931692611a2b9285928792611a26926dffffffffffffffffffffffffffff169185916370a0823191602480820192602092909190829003018186803b1580156119ee57600080fd5b505afa158015611a02573d6000803e3d6000fd5b505050506040513d6020811015611a1857600080fd5b50519063ffffffff61226e16565b611fdb565b600854604080517f70a082310000000000000000000000000000000000000000000000000000000081523060048201529051611aca9284928792611a26926e01000000000000000000000000000090046dffffffffffffffffffffffffffff169173ffffffffffffffffffffffffffffffffffffffff8616916370a0823191602480820192602092909190829003018186803b1580156119ee57600080fd5b50506001600c5550565b60055473ffffffffffffffffffffffffffffffffffffffff1681565b60075473ffffffffffffffffffffffffffffffffffffffff1681565b42841015611b7b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f556e697377617056323a20455850495245440000000000000000000000000000604482015290519081900360640190fd5b60035473ffffffffffffffffffffffffffffffffffffffff80891660008181526004602090815260408083208054600180820190925582517f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98186015280840196909652958d166060860152608085018c905260a085019590955260c08085018b90528151808603909101815260e0850182528051908301207f19010000000000000000000000000000000000000000000000000000000000006101008601526101028501969096526101228085019690965280518085039096018652610142840180825286519683019690962095839052610162840180825286905260ff89166101828501526101a284018890526101c28401879052519193926101e2808201937fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe081019281900390910190855afa158015611cdc573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff811615801590611d5757508873ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16145b611dc257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601c60248201527f556e697377617056323a20494e56414c49445f5349474e415455524500000000604482015290519081900360640190fd5b611dcd89898961259c565b505050505050505050565b600260209081526000928352604080842090915290825290205481565b600c54600114611e6657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601160248201527f556e697377617056323a204c4f434b4544000000000000000000000000000000604482015290519081900360640190fd5b6000600c55600654604080517f70a082310000000000000000000000000000000000000000000000000000000081523060048201529051611fd49273ffffffffffffffffffffffffffffffffffffffff16916370a08231916024808301926020929190829003018186803b158015611edd57600080fd5b505afa158015611ef1573d6000803e3d6000fd5b505050506040513d6020811015611f0757600080fd5b5051600754604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905173ffffffffffffffffffffffffffffffffffffffff909216916370a0823191602480820192602092909190829003018186803b158015611f7a57600080fd5b505afa158015611f8e573d6000803e3d6000fd5b505050506040513d6020811015611fa457600080fd5b50516008546dffffffffffffffffffffffffffff808216916e0100000000000000000000000000009004166122e0565b6001600c55565b604080518082018252601981527f7472616e7366657228616464726573732c75696e743235362900000000000000602091820152815173ffffffffffffffffffffffffffffffffffffffff85811660248301526044808301869052845180840390910181526064909201845291810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fa9059cbb000000000000000000000000000000000000000000000000000000001781529251815160009460609489169392918291908083835b602083106120e157805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe090920191602091820191016120a4565b6001836020036101000a0380198251168184511680821785525050505050509050019150506000604051808303816000865af19150503d8060008114612143576040519150601f19603f3d011682016040523d82523d6000602084013e612148565b606091505b5091509150818015612176575080511580612176575080806020019051602081101561217357600080fd5b50515b6121e157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601a60248201527f556e697377617056323a205452414e534645525f4641494c4544000000000000604482015290519081900360640190fd5b5050505050565b60008115806122035750508082028282828161220057fe5b04145b610df657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f64732d6d6174682d6d756c2d6f766572666c6f77000000000000000000000000604482015290519081900360640190fd5b80820382811115610df657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601560248201527f64732d6d6174682d7375622d756e646572666c6f770000000000000000000000604482015290519081900360640190fd5b6dffffffffffffffffffffffffffff841180159061230c57506dffffffffffffffffffffffffffff8311155b61237757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f556e697377617056323a204f564552464c4f5700000000000000000000000000604482015290519081900360640190fd5b60085463ffffffff428116917c0100000000000000000000000000000000000000000000000000000000900481168203908116158015906123c757506dffffffffffffffffffffffffffff841615155b80156123e257506dffffffffffffffffffffffffffff831615155b15612492578063ffffffff16612425856123fb86612a57565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff169063ffffffff612a7b16565b600980547bffffffffffffffffffffffffffffffffffffffffffffffffffffffff929092169290920201905563ffffffff8116612465846123fb87612a57565b600a80547bffffffffffffffffffffffffffffffffffffffffffffffffffffffff92909216929092020190555b600880547fffffffffffffffffffffffffffffffffffff0000000000000000000000000000166dffffffffffffffffffffffffffff888116919091177fffffffff0000000000000000000000000000ffffffffffffffffffffffffffff166e0100000000000000000000000000008883168102919091177bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167c010000000000000000000000000000000000000000000000000000000063ffffffff871602179283905560408051848416815291909304909116602082015281517f1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1929181900390910190a1505050505050565b73ffffffffffffffffffffffffffffffffffffffff808416600081815260026020908152604080832094871680845294825291829020859055815185815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a3505050565b73ffffffffffffffffffffffffffffffffffffffff8316600090815260016020526040902054612641908263ffffffff61226e16565b73ffffffffffffffffffffffffffffffffffffffff8085166000908152600160205260408082209390935590841681522054612683908263ffffffff612abc16565b73ffffffffffffffffffffffffffffffffffffffff80841660008181526001602090815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b600080600560009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663017e7e586040518163ffffffff1660e01b815260040160206040518083038186803b15801561275757600080fd5b505afa15801561276b573d6000803e3d6000fd5b505050506040513d602081101561278157600080fd5b5051600b5473ffffffffffffffffffffffffffffffffffffffff821615801594509192509061286457801561285f5760006127d86112576dffffffffffffffffffffffffffff88811690881663ffffffff6121e816565b905060006127e583612878565b90508082111561285c576000612813612804848463ffffffff61226e16565b6000549063ffffffff6121e816565b905060006128388361282c86600563ffffffff6121e816565b9063ffffffff612abc16565b9050600081838161284557fe5b04905080156128585761285887826128ca565b5050505b50505b612870565b8015612870576000600b555b505092915050565b600060038211156128bb575080600160028204015b818110156128b5578091506002818285816128a457fe5b0401816128ad57fe5b04905061288d565b506128c5565b81156128c5575060015b919050565b6000546128dd908263ffffffff612abc16565b600090815573ffffffffffffffffffffffffffffffffffffffff8316815260016020526040902054612915908263ffffffff612abc16565b73ffffffffffffffffffffffffffffffffffffffff831660008181526001602090815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b6000818310612989578161298b565b825b9392505050565b73ffffffffffffffffffffffffffffffffffffffff82166000908152600160205260409020546129c8908263ffffffff61226e16565b73ffffffffffffffffffffffffffffffffffffffff831660009081526001602052604081209190915554612a02908263ffffffff61226e16565b600090815560408051838152905173ffffffffffffffffffffffffffffffffffffffff8516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef919081900360200190a35050565b6dffffffffffffffffffffffffffff166e0100000000000000000000000000000290565b60006dffffffffffffffffffffffffffff82167bffffffffffffffffffffffffffffffffffffffffffffffffffffffff841681612ab457fe5b049392505050565b80820182811015610df657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f64732d6d6174682d6164642d6f766572666c6f77000000000000000000000000604482015290519081900360640190fdfe556e697377617056323a20494e53554646494349454e545f4f55545055545f414d4f554e54556e697377617056323a20494e53554646494349454e545f494e5055545f414d4f554e54556e697377617056323a20494e53554646494349454e545f4c4951554944495459556e697377617056323a20494e53554646494349454e545f4c49515549444954595f4255524e4544556e697377617056323a20494e53554646494349454e545f4c49515549444954595f4d494e544544a265627a7a723158207dca18479e58487606bf70c79e44d8dee62353c9ee6d01f9a9d70885b8765f2264736f6c63430005100032',
  notes: 'https://etherscan.io/address/0xa924EAe56f772626Cf13B08c2BF384db9059E3bE#code',
})

addContractInfo({
  vm: 'EVM',
  type: 'GnosisProxy',
  code: '0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea265627a7a72315820d8a00dc4fe6bf675a9d7416fc2d00bb3433362aa8186b750f76c4027269667ff64736f6c634300050e0032',
  notes: 'https://etherscan.io/address/0xa1Eaccdf7AAc2aa5F3C11363bc4dB688eE6EC2C6#code',
})

addContractInfo({
  vm: 'EVM',
  type: 'FlashWallet_ZeroExProxy',
  code: '0x6080604052600436106100745760003560e01c8063b68df16d1161004e578063b68df16d146100f8578063bc197c811461010b578063c0ee0b8a14610138578063f23a6e611461015a5761007b565b806301ffc9a71461008057806354132d78146100b65780638da5cb5b146100d65761007b565b3661007b57005b600080fd5b34801561008c57600080fd5b506100a061009b366004610a20565b61017a565b6040516100ad9190610cc5565b60405180910390f35b6100c96100c4366004610837565b61025f565b6040516100ad9190610cfd565b3480156100e257600080fd5b506100eb610397565b6040516100ad9190610bca565b6100c96101063660046107e4565b6103bb565b34801561011757600080fd5b5061012b610126366004610891565b6104e8565b6040516100ad9190610cd0565b34801561014457600080fd5b506101586101533660046109c6565b610515565b005b34801561016657600080fd5b5061012b61017536600461094c565b61051b565b60007fffffffff0000000000000000000000000000000000000000000000000000000082167f01ffc9a700000000000000000000000000000000000000000000000000000000148061020d57507fffffffff0000000000000000000000000000000000000000000000000000000082167f4e2312e000000000000000000000000000000000000000000000000000000000145b8061025957507fffffffff0000000000000000000000000000000000000000000000000000000082167fc0ee0b8a00000000000000000000000000000000000000000000000000000000145b92915050565b60603373ffffffffffffffffffffffffffffffffffffffff7f000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff16146102d0576102d06102cb337f000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff610546565b6105e8565b60008573ffffffffffffffffffffffffffffffffffffffff168386866040516102fa929190610ad0565b60006040518083038185875af1925050503d8060008114610337576040519150601f19603f3d011682016040523d82523d6000602084013e61033c565b606091505b50925090508061038e5761038e6102cb308888888080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152508a92508991506105f09050565b50949350505050565b7f000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff81565b60603373ffffffffffffffffffffffffffffffffffffffff7f000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff1614610427576104276102cb337f000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff610546565b60008473ffffffffffffffffffffffffffffffffffffffff168484604051610450929190610ad0565b600060405180830381855af49150503d806000811461048b576040519150601f19603f3d011682016040523d82523d6000602084013e610490565b606091505b5092509050806104e0576104e06102cb308787878080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152508992506106a7915050565b509392505050565b7fbc197c810000000000000000000000000000000000000000000000000000000098975050505050505050565b50505050565b7ff23a6e61000000000000000000000000000000000000000000000000000000009695505050505050565b6060631de45ad160e01b8383604051602401610563929190610beb565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529190526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fffffffff0000000000000000000000000000000000000000000000000000000090931692909217909152905092915050565b805160208201fd5b60606040516105fe90610b55565b6040518091039020868686868660405160240161061f959493929190610c68565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529190526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fffffffff0000000000000000000000000000000000000000000000000000000090931692909217909152905095945050505050565b60606040516106b590610ae0565b6040518091039020858585856040516024016106d49493929190610c12565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529190526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fffffffff00000000000000000000000000000000000000000000000000000000909316929092179091529050949350505050565b60008083601f84011261076c578182fd5b50813567ffffffffffffffff811115610783578182fd5b602083019150836020808302850101111561079d57600080fd5b9250929050565b60008083601f8401126107b5578182fd5b50813567ffffffffffffffff8111156107cc578182fd5b60208301915083602082850101111561079d57600080fd5b6000806000604084860312156107f8578283fd5b833561080381610d10565b9250602084013567ffffffffffffffff81111561081e578283fd5b61082a868287016107a4565b9497909650939450505050565b6000806000806060858703121561084c578081fd5b843561085781610d10565b9350602085013567ffffffffffffffff811115610872578182fd5b61087e878288016107a4565b9598909750949560400135949350505050565b60008060008060008060008060a0898b0312156108ac578384fd5b88356108b781610d10565b975060208901356108c781610d10565b9650604089013567ffffffffffffffff808211156108e3578586fd5b6108ef8c838d0161075b565b909850965060608b0135915080821115610907578586fd5b6109138c838d0161075b565b909650945060808b013591508082111561092b578384fd5b506109388b828c016107a4565b999c989b5096995094979396929594505050565b60008060008060008060a08789031215610964578182fd5b863561096f81610d10565b9550602087013561097f81610d10565b94506040870135935060608701359250608087013567ffffffffffffffff8111156109a8578283fd5b6109b489828a016107a4565b979a9699509497509295939492505050565b600080600080606085870312156109db578384fd5b84356109e681610d10565b935060208501359250604085013567ffffffffffffffff811115610a08578283fd5b610a14878288016107a4565b95989497509550505050565b600060208284031215610a31578081fd5b81357fffffffff0000000000000000000000000000000000000000000000000000000081168114610a60578182fd5b9392505050565b60008151808452815b81811015610a8c57602081850181015186830182015201610a70565b81811115610a9d5782602083870101525b50601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b6000828483379101908152919050565b7f57616c6c65744578656375746544656c656761746543616c6c4661696c65644581527f72726f7228616464726573732c616464726573732c62797465732c627974657360208201527f2900000000000000000000000000000000000000000000000000000000000000604082015260410190565b7f57616c6c65744578656375746543616c6c4661696c65644572726f722861646481527f726573732c616464726573732c62797465732c75696e743235362c627974657360208201527f2900000000000000000000000000000000000000000000000000000000000000604082015260410190565b73ffffffffffffffffffffffffffffffffffffffff91909116815260200190565b73ffffffffffffffffffffffffffffffffffffffff92831681529116602082015260400190565b600073ffffffffffffffffffffffffffffffffffffffff808716835280861660208401525060806040830152610c4b6080830185610a67565b8281036060840152610c5d8185610a67565b979650505050505050565b600073ffffffffffffffffffffffffffffffffffffffff808816835280871660208401525060a06040830152610ca160a0830186610a67565b8460608401528281036080840152610cb98185610a67565b98975050505050505050565b901515815260200190565b7fffffffff0000000000000000000000000000000000000000000000000000000091909116815260200190565b600060208252610a606020830184610a67565b73ffffffffffffffffffffffffffffffffffffffff81168114610d3257600080fd5b5056fea264697066735822122051210ea164787c6b805fbc2880dc6623a837fbf77e01e1c9596d2985813b475764736f6c634300060a0033',
  notes: 'https://etherscan.io/address/0x22F9dCF4647084d6C31b2765F6910cd85C178C18#code',
})

const a = [
  {
    'network': 'mainnet',
    'address': '0x59B8c20CA527ff18e2515b68F28939d6dD3E867B',
    'type': 'UniswapV2Pair',
  },
  {
    'network': 'mainnet',
    'address': '0xa924EAe56f772626Cf13B08c2BF384db9059E3bE',
    'type': 'UniswapV2Pair',
  },
  {
    'network': 'mainnet',
    'address': '0xc77aab3c6d7dab46248f3cc3033c856171878bd5',
    'type': 'TeamFinance',
  },
  {
    'network': 'mainnet',
    'address': '0x33a4288AB7043C274AACD2c9Eb8a931c30C0288a',
    'type': 'NFTrade',
  },
]
