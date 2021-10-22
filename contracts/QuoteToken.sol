// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/* mythx-disable SWC-103 */
/* mythx-disable SWC-116 */

contract QuoteToken is OwnableUpgradeable, ERC20PausableUpgradeable {

    function initialize(uint totalSupply, address[] calldata recipients, uint[] calldata amounts) public initializer {
        // https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC20_init_unchained("Quote Token", "QUOTE");
        __Pausable_init_unchained();
        __ERC20Pausable_init_unchained();

        _mint(owner(), totalSupply);

        require(recipients.length == amounts.length, "LRA");
        for (uint i = 0; i < recipients.length; i++) {
            _transfer(owner(), recipients[i], amounts[i]);
        }
    }

}
