# Claim Bull Token

## Set gas price

`export GAS_PRICE=20 # Lookup on https://ethgasstation.info/`

## Export environment variables

Ropsten:

```
export NETWORK=ropsten
export BULL_PROXY_ADDRESS=0xe14F083364F970d528Ea03c2cA71c7Dce45B719F
```


Mainnet:

```
export NETWORK=mainnet
export BULL_PROXY_ADDRESS=0x1Bb022aB668085C6417B7d7007b0fbD53bACc383
```

## Create keys file

```
rm -f /tmp/keys.txt
echo $KEY1 >> /tmp/keys.txt
echo $KEY2 >> /tmp/keys.txt
# ... add more keys (1 key per line)
# ... you can leave those keys that have already claimed BULL - the code checks the available claim amount before sending transaction
```

## Claim BULL

`npx hardhat claim --token $BULL_PROXY_ADDRESS --keys /tmp/keys.txt --network $NETWORK`
