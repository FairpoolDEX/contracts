# Claim Bull Token

## Set gas price

`export GAS_PRICE=20 # Lookup on https://ethgasstation.info/`

## Export environment variables

Ropsten:

```
export NETWORK=ropsten
export BULL_PROXY_ADDRESS=0xbc50A0b8F5E38dEe3a3e5B64B2D035ceF3D29f83
```


Mainnet:

```
export NETWORK=mainnet
export BULL_PROXY_ADDRESS=0x1Bb022aB668085C6417B7d7007b0fbD53bACc383
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

`npx hardhat claim --token $BULL_PROXY_ADDRESS --claimer $CLAIMER --claims $CLAIMS --network $NETWORK`
