// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Recoverable {
    modifier onlyKeeper() virtual { _; }

    function recoverERC20(IERC20 token, uint256 amount) public onlyKeeper {
        token.transfer(msg.sender, amount);
    }

    function recoverERC721(IERC721 token, uint256 tokenId) public onlyKeeper {
        token.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    // NOTE: ERC1155 implement only safeTransferFrom, which reverts if the user sends the tokens to a contract that does not implement IERC1155Receiver
}
