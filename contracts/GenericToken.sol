// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GenericToken is ERC20, Ownable {

    constructor(string memory name_, string memory symbol_, uint totalSupply_, address[] memory recipients_, uint[] memory amounts_) ERC20(name_, symbol_) Ownable() {

        _mint(owner(), totalSupply_);

        require(recipients_.length == amounts_.length, "LRA");
        for (uint i = 0; i < recipients_.length; i++) {
            _transfer(owner(), recipients_[i], amounts_[i]);
        }
    }

}
