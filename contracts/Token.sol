// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// FIXME: Solidity warning
struct FrozenWallet {
    address wallet;
    uint256 totalAmount;
    uint256 monthlyAmount;
    uint256 initialAmount;
    uint256 lockDaysPeriod;
    bool scheduled;
}

struct VestingType {
    uint256 monthlyRate;
    uint256 initialRate;
    uint256 lockDaysPeriod;
}


contract ShieldToken is OwnableUpgradeable, ERC20PausableUpgradeable {
    // one wallet can belongs only to a single vesting type
    mapping(address => FrozenWallet) public frozenWallets;
    VestingType[] public vestingTypes;
    uint256 public releaseTime;

    function initialize(uint256 _releaseTime) public initializer {
        __Ownable_init();
        __ERC20_init("Shield Finance Token", "SHLD");
        __ERC20Pausable_init();

        setReleaseTime(_releaseTime);

        // Mint totalSupply to the owner
        _mint(owner(), getMaxTotalSupply());

        // TODO: add tests: after deploy, send tokens from public vesting.

        // Seed:	Locked for 1 month, 5% on first release, then equal parts of 12% over total of 9 months
        vestingTypes.push(VestingType(12, 5, 30 days));
        // Private:	10% at listing, then equal parts of 18% over total of 6 months
        vestingTypes.push(VestingType(18, 10, 0));
        // TODO: 14563107 SHLD to 0x47677e21BCe4d8bd1aF04e1c651b6B29b8eCf1a3 (Ignition wallet address) - move it to distribution script
        // Advisors, Partners:	Locked for 1 month, 4% on first release, then equal parts of 4% over total of 24 months
        vestingTypes.push(VestingType(4, 4, 30 days));
        // Team:	Locked for 12 months, 8% on first release, then equal parts of 8% over total of 12 months
        vestingTypes.push(VestingType(8, 8, 12 * 30 days));
        // Development:	Locked for 6 months, 3% on first release, then equal parts of 3% over total of 36 months
        vestingTypes.push(VestingType(3, 3, 6 * 30 days));
        // Marketing:	Locked for 3 months, 2% on first release, then equal parts of 2% over total of 48 months
        vestingTypes.push(VestingType(2, 2, 3 * 30 days));
        // Liquidity mining:	8% at listing, then equal parts of 8% over total of 12 months
        vestingTypes.push(VestingType(8, 8, 0));
        // General Reserve:	Locked for 6 months, 2% on first release, then equal parts of 2% over total of 60 months
        vestingTypes.push(VestingType(2, 2, 6 * 30 days));
    }

    function getMaxTotalSupply() public pure returns (uint256) {
        return 969_163_000 * 10 ** 18;
    }

    function addAllocations(address[] memory addresses, uint[] memory totalAmounts, uint vestingTypeIndex) external payable onlyOwner returns (bool) {
        uint addressesLength = addresses.length;

        require(addressesLength == totalAmounts.length, "Address and totalAmounts length must be same");
        require(vestingTypeIndex < vestingTypes.length, "Invalid vestingTypeIndex");

        VestingType memory vestingType = vestingTypes[vestingTypeIndex];

        for (uint256 i = 0; i < addressesLength; i++) {
            address _address = addresses[i];

            uint256 totalAmount = totalAmounts[i] * 10 ** 18;
            // TODO: fix amounts
            uint256 monthlyAmount = totalAmounts[i] * vestingType.monthlyRate * 10 ** 18 / 100;
            uint256 initialAmount = totalAmounts[i] * vestingType.initialRate * 10 ** 18 / 100;
            uint256 lockDaysPeriod = vestingType.lockDaysPeriod;

            addFrozenWallet(_address, totalAmount, monthlyAmount, initialAmount, lockDaysPeriod);
        }

        return true;
    }

    function _mint(address account, uint256 amount) internal override {
        uint256 totalSupply = super.totalSupply();
        require(getMaxTotalSupply() >= (totalSupply + amount), "Max total supply over");

        super._mint(account, amount);
    }

    function addFrozenWallet(address wallet, uint totalAmount, uint monthlyAmount, uint initialAmount, uint lockDaysPeriod) internal {
        require(!frozenWallets[wallet].scheduled, "Wallet already frozen");

        super._transfer(msg.sender, wallet, totalAmount);

        // Create frozen wallets
        FrozenWallet memory frozenWallet = FrozenWallet(
            wallet,
            totalAmount,
            monthlyAmount,
            initialAmount,
            lockDaysPeriod,
            true
        );

        // Add wallet to frozen wallets
        frozenWallets[wallet] = frozenWallet;
    }

    // this function returns upper rounded amount of months.
    // 0 - locked
    // 1 - unlock initial amount (vesting not available yet)
    // x... - months since lockup period is over (vesting months == x - 1)
    function getMonths(uint256 lockDaysPeriod) public view returns (uint256) {
        uint256 unlockTime = releaseTime + lockDaysPeriod;

        if (block.timestamp < unlockTime) {
            return 0;
        }

        uint256 diff = block.timestamp - unlockTime;
        uint256 months = diff / 30 days + 1;

        return months;
    }

    function getUnlockedAmount(address sender) public view returns (uint256) {
        uint256 months = getMonths(frozenWallets[sender].lockDaysPeriod);

        // lockup period
        if (months == 0) {
            return 0;
        }

        uint256 sumMonthlyTransferableAmount = frozenWallets[sender].monthlyAmount * (months - 1);
        uint256 totalTransferableAmount = sumMonthlyTransferableAmount + frozenWallets[sender].initialAmount;

        if (totalTransferableAmount > frozenWallets[sender].totalAmount) {
            return frozenWallets[sender].totalAmount;
        }

        return totalTransferableAmount;
    }

    function transferMany(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        uint256 amountsLength = amounts.length;
        uint256 recipientsLength = recipients.length;

        require(recipientsLength == amountsLength, "Wrong array length");

        uint256 total = 0;
        for (uint256 i = 0; i < amountsLength; i++) {
            total = total + amounts[i];
        }

        require(balanceOf(msg.sender) >= total, "ERC20: transfer amount exceeds balance");

        for (uint256 i = 0; i < recipientsLength; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            require(recipient != address(0), "ERC20: transfer to the zero address");

            super._transfer(msg.sender, recipient, amount);
        }
    }

    function getLockedAmount(address sender) public view returns (uint256) {
        uint256 unlockedAmount = getUnlockedAmount(sender);
        return frozenWallets[sender].totalAmount - unlockedAmount;
    }

    // Transfer control
    function canTransfer(address sender, uint256 amount) public view returns (bool) {
        // Control only scheduled wallet
        if (!frozenWallets[sender].scheduled) {
            return true;
        }

        uint256 balance = balanceOf(sender);
        if (balance >= frozenWallets[sender].totalAmount && (balance - frozenWallets[sender].totalAmount) >= amount) {
            return true;
        }

        uint256 lockedAmount = getLockedAmount(sender);

        if (block.timestamp < releaseTime || (balance - amount) < lockedAmount) {
            return false;
        }
        return true;
    }

    // @override
    function _beforeTokenTransfer(address sender, address recipient, uint256 amount) internal virtual override {
        require(canTransfer(sender, amount), "Wait for vesting day!");
        super._beforeTokenTransfer(sender, recipient, amount);
    }

    // TODO: extend to any tokens
    function withdraw(uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success,) = _msgSender().call{value : amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function pause(bool status) public onlyOwner {
        if (status) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setReleaseTime(uint256 _releaseTime) public onlyOwner {
        if (releaseTime > 0) {
            require(releaseTime > block.timestamp, "Can't change release time after release");
        }
        require(_releaseTime > block.timestamp, "Release time should be in future");
        releaseTime = _releaseTime;
    }
}
