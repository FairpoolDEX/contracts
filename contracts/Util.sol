// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

contract Util {
    event LogS(string message);
    event LogU(uint value);
    event LogA(address addr);
    event LogB(bool value);

    function ensureNoDuplicateInArrayOfAddresses(mapping(address => bool) storage cache, address[] memory array, string memory message) internal {
        (bool success, address duplicate) = getFirstDuplicateInArrayOfAddresses(cache, array);
        ensure(!success, array, duplicate, "array", message);
    }

    function getFirstDuplicateInArrayOfAddresses(mapping(address => bool) storage cache, address[] memory array) internal returns (bool success, address duplicate) {
        for (uint i = 0; i < array.length; i++) {
            if (cache[array[i]]) return (true, array[i]);
            cache[array[i]] = true;
        }
        // clear the mapping
        for (uint i = 0; i < array.length; i++) {
            delete cache[array[i]];
        }
        return (false, address(0));
    }

    /* `ensure` functions are overloaded for polymorphic signatures */

    function ensure(bool condition, string memory message) internal {
        if (!condition) {
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address addr, string memory message) internal {
        if (!condition) {
            emit LogA(addr);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address addr, uint value, string memory message) internal {
        if (!condition) {
            emit LogA(addr);
            emit LogU(value);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, string memory arrayName, string memory message) internal {
        if (!condition) {
            logArrayA(array, arrayName);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, address addr, string memory arrayName, string memory message) internal {
        if (!condition) {
            logArrayA(array, arrayName);
            emit LogA(addr);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, uint a, uint b, string memory message) internal {
        if (!condition) {
            emit LogU(a);
            emit LogU(b);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function not(string memory message) pure internal returns (string memory) {
        return string.concat("not(", message, ")");
    }

    function logArrayA(address[] memory array, string memory arrayName) internal {
        emit LogS(string.concat("-- ", arrayName, " start --"));
        for (uint i = 0; i < array.length; i++) {
            emit LogA(array[i]);
        }
        emit LogS(string.concat("-- ", arrayName, " end --"));
    }

    function ensureEqual(uint a, uint b, string memory message) internal {
        ensure(a == b, a, b, message);
    }

    function ensureEqual(uint a, uint b, string memory $a, string memory $b) internal {
        ensure(a == b, a, b, string.concat($a, " == ", $b));
    }

    function ensureNoneEqual(address[] memory array, address target, string memory arrayName) internal {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == target) {
                emit LogA(target);
                emit LogS(not(string.concat(arrayName, "[i] != ", string(abi.encodePacked(target)))));
                assert(false);
            }
        }
    }

}
