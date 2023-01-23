// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/utils/Strings.sol";

contract Util {
//    event Log(string message);
//    event Log(uint value);
//    event Log(address addr);
//    event Log(bool value);

    event Log(string message);
    event Log(string message, bool value);
    event Log(string message, uint value);
    event Log(string message, address value);

    event NotEqual(string $a, string $b, bool a, bool b);
    event NotEqual(string $a, string $b, uint a, uint b);
    event NotEqual(string $a, string $b, address a, address b);
    event NotNotEqual(string $a, string $b, address a, address b);
    event NotNotEqual(string $a, string $b, bool a, bool b);
    event NotNotEqual(string $a, string $b, uint a, uint b);
    event NotLessEqual(string $a, string $b, uint a, uint b);
    event NotGreaterEqual(string $a, string $b, uint a, uint b);

    event AssertionFailed(string $assertion, string $a, string $b, bool a, bool b);
    event AssertionFailed(string $assertion, string $a, string $b, uint a, uint b);
    event AssertionFailed(string $assertion, string $a, string $b, uint a, uint b, uint diff);
    event AssertionFailed(string $assertion, string $a, string $b, int a, int b);
    event AssertionFailed(string $assertion, string $a, string $b, int a, int b, int diff);
    event AssertionFailed(string $assertion, string $a, string $b, address a, address b);

    event LogPN(string name, bool prev, bool next);
    event LogPN(string name, uint prev, uint next, int diff);
    event LogPN(string name, address prev, address next);

    function log(string memory message) internal { emit Log(message); }
    function log(string memory message, uint value) internal { emit Log(message, value); }
    function log(string memory message, address value) internal { emit Log(message, value); }
    function log(string memory message, bool value) internal { emit Log(message, value); }

    function logPN(string memory $name, uint prev, uint next) internal { emit LogPN($name, prev, next, int(next) - int(prev)); }

    function copy(address[] storage source) internal view returns (address[] memory) {
        address[] memory target = new address[](source.length);
        for (uint i = 0; i < source.length; i++) {
            target[i] = source[i];
        }
        return target;
    }

    function sum(address[] storage array, mapping(address => uint) storage values) internal view returns (uint result) {
        for (uint i = 0; i < array.length; i++) {
            result += values[array[i]];
        }
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

    function toString(bool value) internal pure returns (string memory $value) {
        if (value) { return "true"; } else { return "false"; }
    }

    function toString(uint value) internal pure returns (string memory $value) {
        return Strings.toString(value);
    }

    function toString(address value) internal pure returns (string memory $value) {
        return Strings.toHexString(uint160(value), 20);
    }

    function ensure(bool condition, string memory $condition) internal {
        if (!condition) {
            log(not($condition));
        }
        assert(condition);
    }

    function ensure(bool condition, address addr, string memory $addr, string memory $condition) internal {
        if (!condition) {
            emit Log($addr, addr);
            emit Log(not($condition));
        }
        assert(condition);
    }

    function ensure(bool condition, address addr, uint value, string memory $addr, string memory $value, string memory $condition) internal {
        if (!condition) {
            emit Log($addr, addr);
            emit Log($value, value);
            emit Log(not($condition));
        }
        assert(condition);
    }

    function ensure(bool condition, address a, address b, string memory $a, string memory $b, string memory $operator) internal {
        if (!condition) {
            emit Log(string.concat("Failed ", string.concat($operator, "(", $a, ", ", $b, ")"), " ~ ", string.concat($operator, "(", toString(a), ", ", toString(b), ")")));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, string memory $array, string memory $condition) internal {
        if (!condition) {
            logArray(array, $array);
            emit Log(not($condition));
        }
        assert(condition);
    }

    function ensure(bool condition, address[] memory array, address addr, string memory $array, string memory $condition) internal {
        if (!condition) {
            logArray(array, $array);
            emit Log("address", addr);
            emit Log(not($condition));
        }
        assert(condition);
    }

    function ensure(bool condition, uint a, uint b, string memory $condition) internal {
        if (!condition) {
            emit Log("uint a", a);
            emit Log("uint a", b);
            emit Log(not($condition));
        }
        assert(condition);
    }

    function not(string memory message) pure internal returns (string memory) {
        return string.concat("not(", message, ")");
    }

    function logArray(address[] memory array, string memory $array) internal {
        for (uint i = 0; i < array.length; i++) {
            logArrayItem(array, i, $array);
        }
    }

    function logArrayItem(address[] memory array, uint i, string memory $array) internal {
        emit Log(string.concat($array, "[", Strings.toString(i), "]"), array[i]);
    }

    function ensureEqual(uint a, uint b, string memory message) internal {
        ensure(a == b, a, b, message);
    }

    function ensureEqual(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a == b)) emit AssertionFailed("ensureEqual", $a, $b, a, b);
    }

    function ensureEqual(int a, int b, string memory $a, string memory $b) internal {
        if (!(a == b)) emit AssertionFailed("ensureEqual", $a, $b, a, b);
    }

    function ensureEqual(address a, address b, string memory $a, string memory $b) internal {
        if (!(a == b)) emit AssertionFailed("ensureEqual", $a, $b, a, b);
    }

    function ensureNotEqual(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a != b)) emit AssertionFailed("ensureNotEqual", $a, $b, a, b);
    }

    function ensureEqual(address[] memory a, address[] memory b, string memory $a, string memory $b) internal {
        ensureEqual(a.length, b.length, string.concat($a, ".length"), string.concat($b, ".length"));
        for (uint i = 0; i < a.length; i++) {
            ensureEqual(a[i], b[i], string.concat($a, "[", Strings.toString(i), "]"), string.concat($b, "[", Strings.toString(i), "]"));
        }
    }

    function ensureLess(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a < b)) emit AssertionFailed("ensureLess", $a, $b, a, b, a - b);
    }

    function ensureLessEqual(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a <= b)) emit AssertionFailed("ensureLessEqual", $a, $b, a, b, a - b);
    }

    function ensureGreater(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a > b)) emit AssertionFailed("ensureGreater", $a, $b, a, b, b - a);
    }

    function ensureGreaterEqual(uint a, uint b, string memory $a, string memory $b) internal {
        if (!(a >= b)) emit AssertionFailed("ensureGreaterEqual", $a, $b, a, b, b - a);
    }

    function ensureLess(int a, int b, string memory $a, string memory $b) internal {
        if (!(a < b)) emit AssertionFailed("ensureLess", $a, $b, a, b, a - b);
    }

    function ensureLessEqual(int a, int b, string memory $a, string memory $b) internal {
        if (!(a <= b)) emit AssertionFailed("ensureLessEqual", $a, $b, a, b, a - b);
    }

    function ensureGreater(int a, int b, string memory $a, string memory $b) internal {
        if (!(a > b)) emit AssertionFailed("ensureGreater", $a, $b, a, b, b - a);
    }

    function ensureGreaterEqual(int a, int b, string memory $a, string memory $b) internal {
        if (!(a >= b)) emit AssertionFailed("ensureGreaterEqual", $a, $b, a, b, b - a);
    }

    function ensureIncludes(address[] memory array, address target, string memory $array, string memory $target) internal {
        ensure(includes(array, target), array, target, $array, string.concat("includes(", $array, ", ", $target, ")"));
    }

    function ensureNotIncludes(address[] memory array, address target, string memory $array, string memory $target) internal {
        ensure(!includes(array, target), array, target, $array, string.concat("not(includes(", $array, ", ", $target, "))"));
    }

    function includes(address[] memory array, address target) internal pure returns (bool) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == target) return true;
        }
        return false;
    }

    function getOld(address[] storage source) internal view returns (address[] memory) {
        return copy(source);
    }

    function getNew(address[] storage source) internal pure returns (address[] memory) {
        return source;
    }

}
