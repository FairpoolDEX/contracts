// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;


contract Recoverable {
    modifier onlyKeeper() virtual { _; }

}
