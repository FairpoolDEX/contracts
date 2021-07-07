# Deploy Bull Token

## Export environment variables

```
export NETWORK=ropsten
export OLD_FOLDER=/tmp/old-balances && mkdir -p $OLD_FOLDER
export NEW_FOLDER=/tmp/new-balances && mkdir -p $NEW_FOLDER
export GAS_PRICE=$(curl -sS 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken' | json result.ProposeGasPrice) && echo $GAS_PRICE
```

## Deploy token

```
npx hardhat deployBullToken --network $NETWORK
```

## Export environment variables

(see output from the previous command)

## Verify on Etherscan

```
npx hardhat verify --network $NETWORK $BULL_IMPLEMENTATION_ADDRESS
```

## Set claims

```
npx hardhat setClaims --token $BULL_PROXY_ADDRESS --oldfolder $OLD_FOLDER --newfolder $NEW_FOLDER --network $NETWORK --dry true
```

## Attach to token in the console

```
npx hardhat console --network $NETWORK
```

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```
