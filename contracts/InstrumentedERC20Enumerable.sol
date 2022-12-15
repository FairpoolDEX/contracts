// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./ERC20Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InstrumentedERC20Enumerable is ERC20Enumerable, Ownable {

    constructor(string memory name_, string memory symbol_, uint totalSupply_) ERC20(name_, symbol_) Ownable() {
        _mint(owner(), totalSupply_);
    }

    function totalSupplyArray() public view returns (uint) {
        uint _totalSupply;
        for (uint i = 0; i < holders.length; i++) {
            _totalSupply += balanceOf(holders[i]);
        }
        return _totalSupply;
    }

    function assert_totalSupplyArray_eq_totalSupply() public view returns (bool) {
        assert(totalSupplyArray() == totalSupply());
        return true;
    }
}
