# Rollback Bull Token

## Set gas price

```
export GAS_PRICE=$(curl -sS 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken' | json result.ProposeGasPrice) && echo $GAS_PRICE

# For ropsten
export NETWORK=ropsten
export BULL_PROXY_ADDRESS=0xbc50A0b8F5E38dEe3a3e5B64B2D035ceF3D29f83
export FROM_BLOCK_NUMBER = 10593045
export TO_BLOCK_NUMBER = latest

# For mainnet
export NETWORK=mainnet
export BULL_PROXY_ADDRESS=0x1bb022ab668085c6417b7d7007b0fbd53bacc383
export FROM_BLOCK_NUMBER = 12761166
export TO_BLOCK_NUMBER = 12772565
```

## Set claimer

```
export CLAIMER=0x7DCbeFB3b9A12b58af8759e0eB8Df05656dB911D
```


## Download addresses file

```
export CLAIMS=/tmp/claims.csv
```

## Claim BULL

`npx hardhat rollback --name BullToken --address $BULL_PROXY_ADDRESS --from $CLAIMER --claims $CLAIMS --network $NETWORK`
