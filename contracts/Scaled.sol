// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

contract Scaled {
    uint8 internal constant _decimals = 6;
    uint internal constant scale = 10 ** 6;
}
