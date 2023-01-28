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
        ensureGreater(beneficiaries.length, 0, "beneficiaries.length", "0");
        ensureLessEqual(beneficiaries.length, maxBeneficiaries, "beneficiaries.length", "maxBeneficiaries");
    }

    mapping(address => bool) internal beneficiariesUniqueCache;
    function beneficiariesAreUnique() internal {
        ensureNoDuplicateInArrayOfAddresses(beneficiariesUniqueCache, beneficiaries, "beneficiariesAreUnique");
    }

    function beneficiariesAreNonZero() internal {
        ensureNotIncludes(beneficiaries, address(0), "beneficiaries", "address(0)");
    }

    function sharesArePositive() internal {
        for (uint i = 0; i < beneficiaries.length; i++) {
            ensureGreater(shares[beneficiaries[i]], 0, string.concat("shares[beneficiaries[", toString(i),"]]"), "0");
        }
    }

    function sharesSumEqualsScale() internal {
        uint sum = 0;
        for (uint i = 0; i < beneficiaries.length; i++) {
            sum += shares[beneficiaries[i]];
        }
        ensureEqual(sum, scaleOfShares, "sum(shares)", "scale");
    }

    function indexesOfBeneficiariesMatchBeneficiaries() internal {
        for (uint i = 0; i < beneficiaries.length; i++) {
            ensureEqual(indexesOfBeneficiaries[beneficiaries[i]], i, string.concat("indexesOfBeneficiaries[beneficiaries[", toString(i),"]]"), "i");
        }
    }
}
