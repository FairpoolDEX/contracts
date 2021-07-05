# Deploy Bull Token

## Download SHLD old balances to OLD_FOLDER

`export OLD_FOLDER=/tmp/SHLD-old`

## Download SHLD new balances to NEW_FOLDER

`export NEW_FOLDER=/tmp/SHLD-new`

## Set gas price

`export GAS_PRICE=20`

## Deploy token

`npx hardhat deployBullToken --network ropsten`

## Export environment variables

(see output from the previous command)

## Verify on Etherscan

`npx hardhat verify --network ropsten $BULL_IMPLEMENTATION_ADDRESS`

## Set claims

`npx hardhat setClaims --token $BULL_PROXY_ADDRESS --oldfolder $OLD_FOLDER --newfolder $NEW_FOLDER --network ropsten`

## Attach to token in the console

`npx hardhat console --network ropsten`

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```
