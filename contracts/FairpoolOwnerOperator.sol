// SPDX-License-Identifier: UNLICENSED
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
    )
    // forward the arguments
    Fairpool(
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
