# Market Crash Protection

Market Crash Protection is a new DeFi product that protects your profits from sharp price drops.

**For traders:** Market Crash Protection guarantees the price at which you can sell the token. If the market price goes below the guaranteed price, you can sell the token to the Market Crash Protection contract. In this case, you will receive compensation equal to `guaranteed_price * token_amount`.

**For liquidity providers (whales, projects):** Market Crash Protection provides a way to silently accumulate a token at a certain price without moving the market. You can deposit liquidity into the contract and sell protection to traders. When the market crashes, traders will sell the token into your liquidity at the guaranteed price. The best part of it? You will receive premiums while waiting for the crash (while protection is active).

## How it works

### Overview

1. Liquidity providers deposit funds into the contract.
1. Liquidity providers receive "protection tokens".
1. Liquidity providers sell "protection tokens" to traders.
1. If the token pair price goes below the guaranteed price: traders can sell by sending the original tokens to the contract (the "protection tokens" will be burned; traders need to hold "protection tokens" on the same address as the original tokens).

### Developer perspective

The contract needs to be deployed by the developer before it can be used.

1. Developer deploys a Market Crash Protection contract.
1. Developer initializes the Market Crash Protection  contract:
    1. Developer sets a token pair (used to determine the price).
    1. Developer sets a guaranteed price (if it goes below, traders will be compensated).
    1. Developer sets an expiration date (used to lock liquidity).

### Trader perspective

1. Trader buys protection.
1. Token price drops below the guaranteed price.
1. Trader sends tokens to our contract.
1. Trader receives a compensation equal to `guaranteed_price * token_amount`

Note: the compensation is larger than the trader would receive if he simply sold the tokens at market, because the guaranteed price is higher than market price after the crash.

### Liquidity provider receives a premium

1. Liquidity provider deposits funds into our contract.
1. Liquidity provider sells protection.
1. Token price stays above the guaranteed price (trader doesn't sell).
1. Expiration date passes (liquidity provider can withdraw).
1. Liquidity provider withdraws funds + keeps the premium from selling protection.

## Technical specification

### System tests

1. Must allow traders to sell the token at the guaranteed price.
1. Must allow traders to withdraw compensation as soon as they want.
1. Must allow protectors to sell the protection at any price.
1. Must allow protectors to withdraw liquidity after expiration date.
1. Must allow protectors to sub-yield the liquidity into other projects.
1. Must not allow protectors to back out of their promise to buy at the guaranteed price.

### Deployment

* Anybody can deploy a new MCP contract.
* Anybody can call public methods of a new MCP contract.

## Definitions

### Market Crash Protection contract

Market Crash Protection contract (MCP contract) is a smart contract with the following features:
 
* Allows traders to receive compensation if the market price goes below the [guaranteed price](#guaranteed-price).
* Allows liquidity providers to receive premiums by selling [protection tokens] to traders.

Market Crash Protection contract has the following methods:

* [Initialize](#initialize-method)
* [Deposit](#deposit-method)
* [Withdraw]
* [Sell]

Market Crash Protection contract has the following parameters:

### Initialize method

Initialize method allows the [developer](#developer) to set the contract parameters.

Parameters:

* [Base token address]
* [Quote token address]
* [Guaranteed price](#guaranteed-price)

### Deposit method

Deposit method allows the [liquidity providers](#liquidity-provider) to put [quote token](#quote-token) in the smart contract.

Parameters:

* [Quote token amount]

Effects:

* Mints [protection token]:
    * Address: method caller address
    * Amount: [Quote token amount] / [Guaranteed price](#guaranteed-price)

### Guaranteed price

Guaranteed price is 

### Liquidity pool address

Examples:

* 0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929 ([CHT-ETH pool on Uniswap](https://info.uniswap.org/token/0xa7e6b2ce535b83e82ab598e9e432705f8d7ce929))
* 0xd3d2e2692501a5c9ca623199d38826e513033a17 ([UNI-ETH pool on Uniswap](https://info.uniswap.org/pair/0xd3d2e2692501a5c9ca623199d38826e513033a17))
* 0x795065dcc9f64b5614c407a6efdc400da6221fb0 ([SUSHI-ETH pool on Sushiswap](https://www.sushiswap.fi/pair/0x795065dcc9f64b5614c407a6efdc400da6221fb0))

A single Shield contract protects a single liquidity pool.

It is possible to deploy multiple Shield contracts that protect the same liquidity pool, because they can have different deadlines ([deposit deadline block number](#deposit-deadline-block-number) and [withdraw deadline block number](#withdraw-deadline-block-number))

### Deposit deadline block number

Examples:

* 11781922 (Ethereum block #11781922)
* 11800000 (Ethereum block #11800000)
* 11829393 (Ethereum block #11829393)

Deposit deadline motivates the Traders & Protectors to fund the contract. They should only send funds to the contract before the Deposit deadline. If anybody sends the funds to the contract after the Deposit deadline, the transaction will be reverted.

Deposit deadline must be at least ~1 day in future (5760 blocks in future) from when the contract is deployed.

### Withdraw deadline block number

Examples:

* 11800000 (Ethereum block #11800000)
* 11829393 (Ethereum block #11829393)
* 11948384 (Ethereum block #11948384)

Withdraw deadline prevents the Protectors from withdrawing their money too early. It provides time for Traders to withdraw their compensation if the rug pull actually happens. Note that Traders can withdraw only if the rug pull happens on the liquidity pool that is protected by that specific Shield contract (because a single Shield contract protects a single liquidity pool).

### Unlock deadline block number

Examples:

* 11900000 (Ethereum block #11900000)
* 11983438 (Ethereum block #11983438)
* 12064854 (Ethereum block #12064854)

Unlock deadline allows to withdraw stuck deposits. For example:

* Trader deposits 1 ETH.
* Protector deposits 2 ETH.
* Rug pull doesn't happen.
* Protector receives the right to withdraw both his & traders' deposit, but can't it (because he lost his private key).
* Trader can't withdraw either (because rug pull didn't happen)
* Trader realizes that his deposit is stuck.
* Trader waits until "Unlock deadline block number".
* Trader withdraws his deposit ("un-stucks" it).

### Developer

Developer is the person that writes & deploys smart contracts.

In case of [MCP contracts](#market-crash-protection-contract), developer can be any technical employee of Shield Finance. 

### Liquidity provider

### Trader

### Base token

### Quote token

### Protection token
