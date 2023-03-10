// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GenericERC1155 is ERC1155, Ownable {
    constructor(string memory uri_, address[] memory recipients_, uint[] memory amounts_) ERC1155(uri_) Ownable() {
        require(recipients_.length == amounts_.length, "LRA");
        for (uint i = 0; i < recipients_.length; i++) {
            _mint(recipients_[i], 0, amounts_[i], "");
        }
    }
}
