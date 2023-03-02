// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./SharedOwnership.sol";

contract SharedOwnershipTest is SharedOwnership, Util {
    uint[] $shares;
    address payable[] $marketers;

    constructor() SharedOwnership($marketers, $shares) {}

    function test() public {
        marketersIsBounded();
        marketersAreUnique();
        marketersAreNonZero();
        sharesArePositive();
        sharesSumEqualsScale();
        indexesOfMarketersMatchMarketers();
    }

    function marketersIsBounded() internal {
        ensureGreater(marketers.length, 0, "marketers.length", "0");
        ensureLessEqual(marketers.length, marketersLengthMax, "marketers.length", "maxMarketers");
    }

    mapping(address => bool) internal marketersUniqueCache;
    function marketersAreUnique() internal {
        ensureNoDuplicateInArrayOfAddresses(marketersUniqueCache, marketers, "marketersAreUnique");
    }

    function marketersAreNonZero() internal {
        ensureNotIncludes(marketers, address(0), "marketers", "address(0)");
    }

    function sharesArePositive() internal {
        for (uint i = 0; i < marketers.length; i++) {
            ensureGreater(shares[marketers[i]], 0, string.concat("shares[marketers[", toString(i),"]]"), "0");
        }
    }

    function sharesSumEqualsScale() internal {
        uint sum = 0;
        for (uint i = 0; i < marketers.length; i++) {
            sum += shares[marketers[i]];
        }
        ensureEqual(sum, scale, "sum(shares)", "scale");
    }

    function indexesOfMarketersMatchMarketers() internal {
        for (uint i = 0; i < marketers.length; i++) {
            ensureEqual(marketersIndexes[marketers[i]], i, string.concat("indexesOfMarketers[marketers[", toString(i),"]]"), "i");
        }
    }
}
