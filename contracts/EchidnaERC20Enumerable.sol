// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./InstrumentedERC20Enumerable.sol";

contract EchidnaERC20Enumerable is InstrumentedERC20Enumerable {
    constructor() InstrumentedERC20Enumerable("Echidna Test", "TST", 1000000000000000) {}
}
