# Deploy Bull Token

## Download SHLD balances

`/tmp/SHLD.balances.csv`

## Add SHLD extras

For liquidity providers & stakers.

`/tmp/SHLD.extras.csv`

## Adjust gas

`vim hardhat.config.ts`

## Deploy token

`npx hardhat deployBullToken --network ropsten`

Export environment variables.

## Set claims

`npx hardhat setClaims --token $BULL_PROXY_ADDRESS --balances /tmp/SHLD.balances.csv --extras /tmp/SHLD.extras.csv --network ropsten`

## Verify on Etherscan

`npx hardhat verify --network ropsten $BULL_IMPLEMENTATION_ADDRESS`

## Attach to token in the console

`npx hardhat console --network ropsten`

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```
