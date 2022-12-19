// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/utils/Strings.sol";

contract Util {
    event LogS(string message);
    event LogU(uint value);
    event LogA(address addr);
    event LogB(bool value);

    event Log(address addr);
    event Log(bool value);

    function copy(address[] storage source) internal returns (address[] memory) {
        address[] memory target = new address[](source.length);
        for (uint i = 0; i < source.length; i++) {
            target[i] = source[i];
        }
        return target;
    }

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

    function ensure(bool condition, address a, address b, string memory message) internal {
        if (!condition) {
            emit LogA(a);
            emit LogA(b);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, string memory arrayName, string memory message) internal {
        if (!condition) {
            logArray(array, arrayName);
            emit LogS(not(message));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, address addr, string memory $array, string memory message) internal {
        if (!condition) {
            logArray(array, $array);
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

    function logArray(address[] memory array, string memory arrayName) internal {
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

    function ensureEqual(address a, address b, string memory $a, string memory $b) internal {
        ensure(a == b, a, b, string.concat($a, " == ", $b));
    }

    function ensureEqual(address[] memory a, address[] memory b, string memory $a, string memory $b) internal {
        ensureEqual(a.length, b.length, string.concat($a, ".length"), string.concat($b, ".length"));
        for (uint i = 0; i < a.length; i++) {
            ensureEqual(a[i], b[i], string.concat($a, "[", Strings.toString(i), "]"), string.concat($b, "[", Strings.toString(i), "]"));
        }
    }

    function ensureIncludes(address[] memory array, address target, string memory $array) internal {
        ensure(includes(array, target), array, target, $array, string.concat("includes(", $array, ", ", string(abi.encodePacked(target)), ")"));
    }

    function ensureNotIncludes(address[] memory array, address target, string memory $array) internal {
        ensure(!includes(array, target), array, target, $array, string.concat("not(includes(", $array, ", ", string(abi.encodePacked(target)), "))"));
    }

    function includes(address[] memory array, address target) internal returns (bool) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == target) return true;
        }
        return false;
    }

}
