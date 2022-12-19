// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Util.sol";
import "./SharedOwnership.sol";

contract SharedOwnershipTest is SharedOwnership, Util {
    uint[] $shares;
    address payable[] $beneficiaries;

    constructor() SharedOwnership($beneficiaries, $shares) {}

    function test() public {
        beneficiariesIsBounded();
        beneficiariesAreUnique();
        beneficiariesAreNonZero();
        sharesArePositive();
        sharesSumEqualsScale();
        indexesOfBeneficiariesMatchBeneficiaries();
    }

    function beneficiariesIsBounded() internal {
        ensure(beneficiaries.length > 0, "beneficiaries.length > 0");
        ensure(beneficiaries.length <= maxBeneficiaries, "beneficiaries.length <= maxBeneficiaries");
    }

    mapping(address => bool) internal beneficiariesUniqueCache;
    function beneficiariesAreUnique() internal {
        ensureNoDuplicateInArrayOfAddresses(beneficiariesUniqueCache, beneficiaries, "beneficiariesAreUnique");
    }

    function beneficiariesAreNonZero() internal {
        ensureNotIncludes(beneficiaries, address(0), "beneficiaries");
    }

    function sharesArePositive() internal {
        for (uint i = 0; i < beneficiaries.length; i++) {
            ensure(shares[beneficiaries[i]] > 0, beneficiaries[i], "beneficiariesHavePositiveShare");
        }
    }

    function sharesSumEqualsScale() internal {
        uint sum = 0;
        for (uint i = 0; i < beneficiaries.length; i++) {
            sum += shares[beneficiaries[i]];
        }
        ensure(sum == scale, "beneficiariesHaveTotalShares");
    }

    function indexesOfBeneficiariesMatchBeneficiaries() internal {
        for (uint i = 0; i < beneficiaries.length; i++) {
            uint $i = indexesOfBeneficiaries[beneficiaries[i]];
            ensureEqual($i, i, "indexesOfBeneficiariesMatchBeneficiaries: $i == i");
        }
    }
}
