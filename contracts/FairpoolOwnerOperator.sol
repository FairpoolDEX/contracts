// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Fairpool.sol";

contract FairpoolOwnerOperator is Fairpool {
    constructor(string memory nameNew, string memory symbolNew, uint baseLimitNew, uint quoteOffsetNew, uint8 precisionNew, uint royaltiesNew, uint earningsNew, address payable[] memory beneficiariesNew, uint[] memory sharesNew) Fairpool(nameNew, symbolNew, baseLimitNew, quoteOffsetNew, precisionNew, royaltiesNew, earningsNew, beneficiariesNew, sharesNew) {
        // simplify testing by allowing the owner to receive the fees & call setOperator()
        operator = payable(msg.sender);
    }
}
