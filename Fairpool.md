# Fairpool

Fairpool is a smart contract with the following properties:

* It is an ERC-20 token
* It has zero premine (`totalSupply() == 0` after deployment)
* It can be traded immediately after deployment (the smart contract has native `buy()` and `sell()` functions)
* It completely eliminates the risk of a rug pull (the smart contract receives and sends liquidity only through `buy()` and `sell()` function)

Fairpool unique value proposition is a configurable distribution of trading fees. It treats every current holder as a liquidity provider,

 (no need to provide liquidity because `totalSupply() == 0`)

It has a fixed price curve (using Uniswap formula: `x * y = k`)
