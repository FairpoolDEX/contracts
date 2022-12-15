// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

contract Max {
    function max(uint[] memory a) public pure returns (uint) {
        uint m = 0;
        for (uint i = 0; i < a.length; i++)
            if (a[i] > m)
                m = a[i];

        for (uint i = 0; i < a.length; ++i)
            assert(m >= a[i]);

        return m;
    }

    function test_assert() public view returns (bool) {
        //        assert(1 == 0);
        //        uint[] memory a = [1, 2];
        //        assert(max(a) == 3);
        return true;
    }

}
