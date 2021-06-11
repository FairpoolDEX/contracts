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

## Create addresses file

```
rm -f /tmp/addresses.txt
echo $ADDRESS1 >> /tmp/addresses.txt
echo $ADDRESS2 >> /tmp/addresses.txt
# ... add more addresses (1 address per line)
# ... you can leave those addresses that have already claimed BULL - the code checks the available claim amount before sending transaction
```

## Claim BULL

`npx hardhat claim --token $BULL_PROXY_ADDRESS --addresses /tmp/addresses.txt --network $NETWORK`
