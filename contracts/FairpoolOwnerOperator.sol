// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Fairpool.sol";

contract FairpoolOwnerOperator is Fairpool {
    constructor(string memory name_, string memory symbol_, uint slope_, uint32 weight_, uint royalties_, uint dividends_, address payable[] memory beneficiaries_, uint[] memory shares_) Fairpool(name_, symbol_, slope_, weight_, royalties_, dividends_, beneficiaries_, shares_) {
        // simplify testing by allowing the owner to receive the fees & call setOperator()
        operator = payable(msg.sender);
    }
}
