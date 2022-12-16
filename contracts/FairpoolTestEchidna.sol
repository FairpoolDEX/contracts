// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./FairpoolTest.sol";

contract FairpoolTestEchidna is FairpoolTest {
    address payable[] $beneficiaries;
    uint[] $shares;

    constructor() Fairpool("Echidna", "TST", maxSpeed - 1, maxTax - 1, $beneficiaries, $shares) {
        // speed and tax can be changed
    }
}
