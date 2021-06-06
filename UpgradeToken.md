# Upgrade Token

## Set gas price

`export GAS_PRICE=20 # Lookup on https://ethgasstation.info/`

## Export environment variables

Ropsten:

```
export NETWORK=ropsten
export SHLD_PROXY_ADDRESS=
export BULL_PROXY_ADDRESS=0xe14F083364F970d528Ea03c2cA71c7Dce45B719F
```


Mainnet:

```
export NETWORK=mainnet
export SHLD_PROXY_ADDRESS=0xd49efa7bc0d339d74f487959c573d518ba3f8437
export BULL_PROXY_ADDRESS=0x1Bb022aB668085C6417B7d7007b0fbD53bACc383
```

## Compile token

`npm run build # cleans the project & recompiles all assets`

## Upgrade token

SHLD:

`npx hardhat upgradeToken --name ShieldToken --address $SHLD_PROXY_ADDRESS --network $NETWORK`

BULL:

`npx hardhat upgradeToken --name BullToken --address $BULL_PROXY_ADDRESS --network $NETWORK`
