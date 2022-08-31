// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract ERC20Enumerable is ERC20 {
    address[] public holders;
    mapping (address => uint) private indexesOfHolders;

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from != address(0) && balanceOf(from) == 0) {
            remove(from);
        }
        // if balanceOf(to) == amount, then balanceOfBeforeTransfer(to) == 0, so it should be added to holders
        if (to != address(0) && balanceOf(to) == amount) {
            add(to);
        }
    }

    /**
     * Assumes that `holder` does not exist in `holders`
     */
    function add(address holder) internal {
        indexesOfHolders[holder] = holders.length;
        holders.push(holder);
    }

    /**
     * Assumes that `holder` exists in `holders`
     * Uses a gas-optimal algorithm for removing the value from array
     * Does not preserve array order
     */
    function remove(address holder) internal {
        uint index = indexesOfHolders[holder];
        address last = holders[holders.length - 1];
        indexesOfHolders[last] = index;
        holders[index] = last;
        holders.pop();
        delete indexesOfHolders[holder];
    }

    function holdersLength() public view returns (uint) {
        return holders.length;
    }
}
