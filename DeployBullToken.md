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

## Verify on Etherscan

`npx hardhat verify --network ropsten $BULL_IMPLEMENTATION_ADDRESS`

## Set claims

`npx hardhat setClaims --token $BULL_PROXY_ADDRESS --oldFolder /tmp/2021-06-04 --newFolder /tmp/2021-07-04 --network ropsten`

## Attach to token in the console

`npx hardhat console --network ropsten`

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```
