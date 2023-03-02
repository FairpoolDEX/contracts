// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;


contract Recoverable {
    modifier onlyKeeper() virtual { _; }

}
