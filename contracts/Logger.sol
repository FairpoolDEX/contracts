// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

contract Logger {
    event LogS(string message);
    event LogU(uint value);
    event LogA(address addr);
    event LogB(bool value);
}
