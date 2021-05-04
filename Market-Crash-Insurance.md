# Market Crash Insurance

Market Crash Insurance is a new DeFi product that protects your profits from sharp price drops.

**For traders:** Market Crash Insurance guarantees the price at which you can sell the token. If the market price goes below the guaranteed price, you can sell the token to the Market Crash Insurance contract. In this case, you will receive a compensation equal to `guaranteed_price * token_amount`.

**For liquidity providers (whales, projects):** Market Crash Insurance provides a way to silently accumulate a token at a certain price without moving the market. You can deposit liquidity into the contract and sell insurance to traders. When the market crashes, traders will sell the token into your liquidity at the guaranteed price. The best part of it? You will receive premiums while waiting for the crash (while insurance is active).

## How it works

### Overview

1. Liquidity providers deposit funds into the contract.
1. Liquidity providers receive "insurance tokens".
1. Liquidity providers sell "insurance tokens" to traders.
1. If the token pair price goes below the guaranteed price: traders can sell by sending the original tokens to the contract (the "insurance tokens" will be burned; traders need to hold "insurance tokens" on the same address as the original tokens).

### Developer perspective

The contract needs to be deployed by the developer before it can be used.

1. Developer deploys a Market Crash Insurance contract.
1. Developer initializes the Market Crash Insurance  contract:
    1. Developer sets a token pair (used to determine the price).
    1. Developer sets a guaranteed price (if it goes below, traders will be compensated).
    1. Developer sets an expiration date (used to lock liquidity).

### Trader perspective

1. Trader buys insurance.
1. Token price drops below the guaranteed price.
1. Trader sends tokens to our contract.
1. Trader receives a compensation equal to `guaranteed_price * token_amount`

Note: the compensation is larger than the trader would receive if he simply sold the tokens at market, because the guaranteed price is higher than market price after the crash.

### Liquidity provider receives a premium

1. Liquidity provider deposits funds into our contract.
1. Liquidity provider sells insurance.
1. Token price stays above the guaranteed price (trader doesn't sell).
1. Expiration date passes (liquidity provider can withdraw).
1. Liquidity provider withdraws funds + keeps the premium from selling insurance.
