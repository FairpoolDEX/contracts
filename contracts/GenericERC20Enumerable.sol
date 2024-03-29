// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GenericERC20Enumerable is ERC20Enumerable, Ownable {

    constructor(string memory name_, string memory symbol_, uint totalSupply_, address[] memory recipients_, uint[] memory amounts_) ERC20(name_, symbol_) Ownable() {

        _mint(owner(), totalSupply_);

        require(recipients_.length == amounts_.length, "LRA");
        for (uint i = 0; i < recipients_.length; i++) {
            _transfer(owner(), recipients_[i], amounts_[i]);
        }
    }

}
