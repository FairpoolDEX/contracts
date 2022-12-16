// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./ERC20EnumerableTest.sol";

contract ERC20EnumerableTestEchidna is ERC20EnumerableTest {
    constructor() ERC20EnumerableTest("Echidna", "TST", 1000000000000000) {
        // burn() allows to test the cases where totalSupply == 0
    }
}
