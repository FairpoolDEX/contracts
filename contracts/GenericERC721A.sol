// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GenericERC721A is ERC721A, Ownable {
    constructor(string memory name_, string memory symbol_, address[] memory recipients_, uint[] memory _amounts) ERC721A(name_, symbol_) Ownable() {
        require(recipients_.length == _amounts.length, "LRA");
        for (uint i = 0; i < recipients_.length; i++) {
            _mint(recipients_[i], _amounts[i]);
        }
    }
}
