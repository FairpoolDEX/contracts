# Deploy Bull Token

## Export environment variables

```bash
export NETWORK=ropsten
export OLD_FOLDER=/tmp/old-balances && mkdir -p $OLD_FOLDER
export NEW_FOLDER=/tmp/new-balances && mkdir -p $NEW_FOLDER
export MAX_FEE=$(curl -sS 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken' | json result.ProposeGasPrice) && echo $MAX_FEE
```

## Deploy token

```bash
hardhat deployBullToken --network $NETWORK
```

## Export environment variables again

(see output from the previous command)

## Verify on Etherscan

```bash
hardhat verify --network $NETWORK $BULL_IMPLEMENTATION_ADDRESS
```

## Set claims

```bash
hardhat setClaims --token $BULL_PROXY_ADDRESS --prevfolder $OLD_FOLDER --nextfolder $NEW_FOLDER --network $NETWORK --dry true
```

## Attach to token in the console

```bash
hardhat console --network $NETWORK
```

```javascript
const Token = await ethers.getContractFactory("BullToken")
const token = await Token.attach(process.env['BULL_PROXY_ADDRESS'])
```
