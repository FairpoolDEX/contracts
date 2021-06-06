# Deploy Bull Token

## Set SHLD old balances

`/tmp/SHLD.olds.csv`

## Download SHLD balances

`/tmp/SHLD.balances.csv`

## Add SHLD extras

For liquidity providers & stakers.

`/tmp/SHLD.extras.csv`

## Set gas price

`export GAS_PRICE=20`

## Deploy token

`npx hardhat deployBullToken --network ropsten`

## Export environment variables

(see output from the previous command)

## Set claims

`npx hardhat setClaims --token $BULL_PROXY_ADDRESS --balances /tmp/SHLD.balances.csv --extras /tmp/SHLD.extras.csv --olds /tmp/SHLD.olds.csv --network ropsten`

## Verify on Etherscan

`npx hardhat verify --network ropsten $BULL_IMPLEMENTATION_ADDRESS`

## Attach to token in the console

`npx hardhat console --network ropsten`

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```

## Conduct the airdrop

1. Set claims
1. Save current SHLD balances to SHLD.olds.csv
1. Set claims again (4x)
   1. Add 0x1b73ed7D318d14acE50668C54af874d59715eb48,17,000.146042336240512094
   1. Add 0x28ee77651097417892B8F4997E0709A8a9c2fb04,35,222.122896253557316211 
1. On last time: mint the remaining amount to deployer, burn it, show the burn transaction to the community.
