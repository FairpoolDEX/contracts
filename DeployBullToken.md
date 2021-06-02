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

## Conduct the airdrop

1. Set claims
1. Save current SHLD balances to SHLD.old.csv
1. Set claims again
1. If it's the last time: set all claims to 0 (technically not necessary, because it won't allow to mint more than maxSupply)
