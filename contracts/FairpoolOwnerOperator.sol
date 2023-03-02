// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Fairpool.sol";

contract FairpoolOwnerOperator is Fairpool {
    constructor(
        string memory nameNew,
        string memory symbolNew,
        uint baseLimitNew,
        uint quoteOffsetNew,
        uint8 precisionNew,
        uint[][] memory sharesNew,
        address[][] memory controllersNew,
        address[] memory recipientsNew,
        uint[] memory gasLimitsNew
    ) Fairpool(
        nameNew,
        symbolNew,
        baseLimitNew,
        quoteOffsetNew,
        precisionNew,
        sharesNew,
        controllersNew,
        recipientsNew,
        gasLimitsNew
    ) {
//        // simplify testing by allowing the owner to receive the fees & call setOperator()
//        owner = payable(msg.sender);
    }
}
