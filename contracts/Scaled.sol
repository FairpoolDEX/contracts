// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;


/**
 * Frontend code assumes that scale = 10 ** _decimals
 */
contract Scaled {
    uint8 internal constant _decimals = 18;
    uint internal constant scale = 10 ** _decimals;
}
