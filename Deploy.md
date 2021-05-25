# How to Deploy:

## Setup environment

- In `.env` file set `INFURA_API_KEY`, `ETHERSCAN_API_KEY`, and `MNEMONIC` (see `.env.example` for details)
- In `parameters.ts` set `ALLOCATIONS` and `RELEASE_TIME`
  
## Deploy

### Localhost:
`npm run deploy`

### Mainnet | Ropsten
`npm run deploy -- --network {mainnet|ropsten}`

Example output:
```
Compiling 1 file with 0.8.4
Compilation finished successfully
Creating Typechain artifacts in directory typechain for target ethers-v5
Successfully generated Typechain artifacts!
Deploying with the account: 0x28A987cA00b4984ecC7d2f3f35E10451A0D8e5Ff
Proxy address: 0xA1E58E80661939Aa028856119911061465a3ce5F
Implementation address: 0x986F538Cd6AC1C25C13c4e8D5A24FfB29eded4E2
Vesting "0": added for 3 addresses
Vesting "1": added for 2 addresses
Vesting "2": added for 2 addresses
```

## Download frozen wallets

* `rm /tmp/Shield\ Frozen\ Wallets\ -\ Wallets.csv`
* Google Sheets -> Download as .csv
* `node scripts/csv_parser.js /tmp/Shield\ Frozen\ Wallets\ -\ Wallets.csv > /tmp/allocations.json`

## Transfer public tokens

`npx hardhat transferMany --token $PROXY_ADDRESS --allocations /tmp/allocations.json --network ropsten`

## Add allocations

`npx hardhat addAllocations --token $PROXY_ADDRESS --allocations /tmp/allocations.json --network ropsten`

## Verify on Etherscan 

`npx hardhat verify --network ropsten $IMPLEMENTATION_ADDRESS`

## Attach to token in the console:

```
// Start console
npx hardhat console --network ropsten

const Token = await ethers.getContractFactory("ShieldToken")
const token = await Token.attach(process.env['PROXY_ADDRESS'])
```

### Enable defense

```
// disable transfers for 100 blocks from now
await token.disableTransfers(100)
```

### Disable defense forever
```
await token.disableBurnBeforeBlockNumber()
```
