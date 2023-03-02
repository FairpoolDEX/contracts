// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./Fairpool.sol";
import "./IncreaseAllowanceHooks.sol";
//import "./Util.sol";

contract FairpoolTest is Fairpool, IncreaseAllowanceHooks, Util {
    address payable[] $marketers;
    uint[] $shares;
    uint8 constant $precision = 18;
    uint constant $baseLimit = 1000;
    uint constant $quoteOffset = 2000;
    uint[][] $sharesNew;
    address[][] $controllersNew;
    address[] $recipientsNew;
    uint[] $gasLimitsNew;
    uint constant $marketersFee = scale / 2 - $fees;
    uint constant $holdersFee = scale / 2 - 1;
    uint constant $fees = scale * 25 / 1000;
    uint constant $commissions = scale * 500 / 1000;
    address payable constant $agent = payable(address(0));

    // TODO: Find a way to call the constructor with complex args (or just use fast-check)
    constructor() Fairpool("FairpoolTest", "FTS", $baseLimit, $quoteOffset, $precision, $sharesNew, $controllersNew, $recipientsNew, $gasLimitsNew) {
        // price params and distribution params can be changed via reset()
    }

    // allow testing different combinations of contract parameters
    // use baseLimitNew * initialPriceNew instead of quoteOffsetNew to improve the probability of passing the validations in setPriceParamsInternal
    function reset(uint baseLimitNew, uint quoteOffsetNew) public onlyOwner {
        // need to copy holders because it's modified in the loop body via _burn()
        address[] memory $holders = copy(holders);
        for (uint i = 0; i < $holders.length; i++) {
            _burn($holders[i], balanceOf($holders[i]));
            delete fees[$holders[i]];
        }
        payable(owner()).transfer(address(this).balance);
        quoteSupply = 0;
        setPriceParamsInternal(baseLimitNew, quoteOffsetNew);
    }

    // msg.value is bounded by native currency supply
    function test() public {
        assertPriceParamsAreBounded();
        assertAllUsersHaveFees();
        assertContractBalanceIsCorrect();
        assertSumOfBuysIsAlmostEqualToBigBuy();
    }

    // Using a struct to avoid the "stack too deep" error
    struct Vars {
        uint quoteSupply;
        uint quoteSupplyReal;
        uint quoteSupplyCalculated;
        uint baseBalanceOfSender;
        uint quoteBalanceOfSender;
        uint quoteBalanceOfOwner;
        uint feeOfSender;
        uint baseSupply;
        uint baseSupplyCalculated;
        uint sumOfFeesOfHolders; // NOTE: This excludes marketers without token balances
        address[] holders;
    }

    function buy(uint baseReceivedMin, uint deadline, address[] calldata referralsNew) public virtual override payable {
        // hardcode the parameters to minimize reverts
        //        baseReceiveMin = 0;
        //        deadline = type(uint).max;
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteSupply = quoteSupply;
        prev.quoteSupplyReal = address(this).balance - msg.value;
        prev.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance + msg.value;
        prev.quoteBalanceOfOwner = sender == owner() ? sender.balance + msg.value : owner().balance;
        prev.feeOfSender = fees[sender];
        prev.baseSupply = totalSupply();
        prev.baseSupplyCalculated = getBaseSupply(quoteSupply);
        prev.sumOfFeesOfHolders = sum(holders, fees);
        prev.holders = getOld(holders);

        super.buy(baseReceivedMin, deadline, referralsNew);

        next.quoteSupply = quoteSupply;
        next.quoteSupplyReal = address(this).balance;
        next.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOwner = sender == owner() ? sender.balance : owner().balance;
        next.feeOfSender = fees[sender];
        next.baseSupply = totalSupply();
        next.baseSupplyCalculated = getBaseSupply(quoteSupply);
        next.sumOfFeesOfHolders = sum(holders, fees);
        next.holders = getNew(holders);

        ensureGreaterEqual(next.quoteSupplyReal, prev.quoteSupplyReal, "next.quoteSupplyReal", "prev.quoteSupplyReal");
        ensureGreaterEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");

        uint diffQuoteSupplyReal = next.quoteSupplyReal - prev.quoteSupplyReal;
        uint diffBaseBalanceOfSender = next.baseBalanceOfSender - prev.baseBalanceOfSender;

        ensureGreaterEqual(diffBaseBalanceOfSender, baseReceivedMin, "diffBaseBalanceOfSender", "baseReceiveMin");
        ensureGreater(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (sender == owner()) {
            ensureLess(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
        } else {
            ensureEqual(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
        }
        ensureGreaterEqual(next.feeOfSender, prev.feeOfSender, "next.feeOfSender", "prev.feeOfSender");
        ensureGreater(next.baseSupply, prev.baseSupply, "next.baseSupply", "prev.baseSupply");
        ensureGreaterEqual(next.sumOfFeesOfHolders, prev.sumOfFeesOfHolders, "next.sumOfFeesOfHolders", "prev.sumOfFeesOfHolders");
        ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureLessEqual(diffQuoteSupplyReal, msg.value, "diffQuoteSupplyReal", "msg.value");
        ensureLessEqual(prev.quoteSupply, prev.quoteSupplyReal, "prev.quoteSupply", "prev.quoteSupplyReal");
        ensureLessEqual(next.quoteSupply, next.quoteSupplyReal, "next.quoteSupply", "next.quoteSupplyReal");
        ensureEqual(prev.quoteSupply, prev.quoteSupplyCalculated, "prev.quoteSupply", "prev.quoteSupplyCalculated");
        ensureEqual(next.quoteSupply, next.quoteSupplyCalculated, "next.quoteSupply", "next.quoteSupplyCalculated");
        ensureGreaterEqual(prev.baseSupply, prev.baseSupplyCalculated, "prev.baseSupply", "prev.baseSupplyCalculated");
        ensureGreaterEqual(next.baseSupply, next.baseSupplyCalculated, "next.baseSupply", "next.baseSupplyCalculated");
        // `quoteSupply == 0` if and only if `next.baseSupply == 0`
        ensureEqual(next.quoteSupply == 0, next.baseSupply == 0, "next.quoteSupply == 0", "next.baseSupply == 0");
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline, bytes memory data) public virtual override returns (uint quoteDistributed) {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteSupply = quoteSupply;
        prev.quoteSupplyReal = address(this).balance;
        prev.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOwner = owner().balance;
        prev.feeOfSender = fees[sender];
        prev.baseSupply = totalSupply();
        prev.baseSupplyCalculated = getBaseSupply(quoteSupply);
        prev.sumOfFeesOfHolders = sum(holders, fees);
        prev.holders = getOld(holders);

        quoteDistributed = super.sell(baseDeltaProposed, quoteReceivedMin, deadline, data);
        ensureNotEqual(quoteDistributed, 0, "quoteDistributed", "0"); // because deltaQuote is always divisible by scale without remainder

        next.quoteSupply = quoteSupply;
        next.quoteSupplyReal = address(this).balance;
        next.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOwner = owner().balance;
        next.feeOfSender = fees[sender];
        next.baseSupply = totalSupply();
        next.baseSupplyCalculated = getBaseSupply(quoteSupply);
        next.sumOfFeesOfHolders = sum(holders, fees);
        next.holders = getNew(holders);

        ensureLessEqual(next.quoteSupplyReal, prev.quoteSupplyReal, "next.quoteSupplyReal", "prev.quoteSupplyReal");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLessEqual(next.feeOfSender, 1, "next.feeOfSender", "delta"); // because feeOfSender can be either 0 or 1 (if balanceOfSender == 0 or balanceOfSender != 0)

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.quoteSupplyReal - next.quoteSupplyReal;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;

        ensureGreaterEqual(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureLessEqual(neg_diffBaseBalanceOfSender, baseDeltaProposed, "neg_diffBaseBalanceOfSender", "baseDeltaProposed");
        ensureGreaterEqual(diffQuoteBalanceOfSender, quoteReceivedMin, "diffQuoteBalanceOfSender", "quoteReceivedMin");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (sender == owner()) {
            // next.quoteBalanceOfOwner can have any relationship with prev.quoteBalanceOfOwner
        } else {
            if (getShareRootEffective(owner()) == 0) {
                ensureEqual(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
            } else {
                ensureGreater(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
            }
        }
        ensureLessEqual(next.feeOfSender, prev.feeOfSender, "next.feeOfSender", "prev.feeOfSender");
        ensureLess(next.baseSupply, prev.baseSupply, "next.baseSupply", "prev.baseSupply");
        // next.sumOfFees can have any relationship with prev.sumOfFees // ensureAny(next.sumOfFees, prev.sumOfFees, "next.sumOfFeesOfHolders", "prev.sumOfFeesOfHolders");
        ensureLessEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        // [sender may have sold the full amount, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureLessEqual(prev.quoteSupply, prev.quoteSupplyReal, "prev.quoteSupply", "prev.quoteSupplyReal");
        ensureLessEqual(next.quoteSupply, next.quoteSupplyReal, "next.quoteSupply", "next.quoteSupplyReal");
        ensureEqual(prev.quoteSupply, prev.quoteSupplyCalculated, "prev.quoteSupply", "prev.quoteSupplyCalculated");
        ensureEqual(next.quoteSupply, next.quoteSupplyCalculated, "next.quoteSupply", "next.quoteSupplyCalculated");
        ensureGreaterEqual(prev.baseSupply, prev.baseSupplyCalculated, "prev.baseSupply", "prev.baseSupplyCalculated");
        ensureGreaterEqual(next.baseSupply, next.baseSupplyCalculated, "next.baseSupply", "next.baseSupplyCalculated");
        // `quoteSupply == 0` if and only if `next.baseSupply == 0`
        ensureEqual(next.quoteSupply == 0, next.baseSupply == 0, "next.quoteSupply == 0", "next.baseSupply == 0");
    }

    function withdrawFees(bytes memory data) public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteSupply = quoteSupply;
        prev.quoteSupplyReal = address(this).balance;
        prev.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOwner = owner().balance;
        prev.feeOfSender = fees[sender];
        prev.baseSupply = totalSupply();
        prev.baseSupplyCalculated = getBaseSupply(quoteSupply);
        prev.sumOfFeesOfHolders = sum(holders, fees);
        prev.holders = getOld(holders);

        super.withdrawFees(data);

        next.quoteSupply = quoteSupply;
        next.quoteSupplyReal = address(this).balance;
        next.quoteSupplyCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOwner = owner().balance;
        next.feeOfSender = fees[sender];
        next.baseSupply = totalSupply();
        next.baseSupplyCalculated = getBaseSupply(quoteSupply);
        next.sumOfFeesOfHolders = sum(holders, fees);
        next.holders = getNew(holders);

        ensureLessEqual(next.quoteSupplyReal, prev.quoteSupplyReal, "next.quoteSupplyReal", "prev.quoteSupplyReal");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.feeOfSender, prev.feeOfSender, "next.feeOfSender", "prev.feeOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.quoteSupplyReal - next.quoteSupplyReal;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;
        uint neg_diffFeeOfSender = prev.feeOfSender - next.feeOfSender;

        ensureGreater(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureEqual(neg_diffBaseBalanceOfSender, 0, "neg_diffBaseBalanceOfSender", "0");
        ensureGreaterEqual(neg_diffBalanceOfContract, diffQuoteBalanceOfSender, "neg_diffBalanceOfContract", "diffQuoteBalanceOfSender");
        ensureGreaterEqual(neg_diffFeeOfSender, prev.feeOfSender - preallocation, "diffFeeOfSender", "quoteReceivedMin");
        ensureLessEqual(next.feeOfSender, 1, "next.feeOfSender", "delta");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (sender == owner()) {
            // this assertion is redundant, because we already check ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender), but we'll leave it for completeness
            ensureGreater(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
        } else {
            ensureEqual(next.quoteBalanceOfOwner, prev.quoteBalanceOfOwner, "next.quoteBalanceOfOwner", "prev.quoteBalanceOfOwner");
        }
        ensureLess(next.feeOfSender, prev.feeOfSender, "next.feeOfSender", "prev.feeOfSender");
        ensureEqual(next.baseSupply, prev.baseSupply, "next.baseSupply", "prev.baseSupply");
        ensureLessEqual(next.sumOfFeesOfHolders, prev.sumOfFeesOfHolders, "next.sumOfFeesOfHolders", "prev.sumOfFeesOfHolders");
        ensureEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureLessEqual(prev.quoteSupply, prev.quoteSupplyReal, "prev.quoteSupply", "prev.quoteSupplyReal");
        ensureLessEqual(next.quoteSupply, next.quoteSupplyReal, "next.quoteSupply", "next.quoteSupplyReal");
        ensureEqual(prev.quoteSupply, prev.quoteSupplyCalculated, "prev.quoteSupply", "prev.quoteSupplyCalculated");
        ensureEqual(next.quoteSupply, next.quoteSupplyCalculated, "next.quoteSupply", "next.quoteSupplyCalculated");
        ensureGreaterEqual(prev.baseSupply, prev.baseSupplyCalculated, "prev.baseSupply", "prev.baseSupplyCalculated");
        ensureGreaterEqual(next.baseSupply, next.baseSupplyCalculated, "next.baseSupply", "next.baseSupplyCalculated");
        // `quoteSupply == 0` if and only if `next.baseSupply == 0`
        ensureEqual(next.quoteSupply == 0, next.baseSupply == 0, "next.quoteSupply == 0", "next.baseSupply == 0");
    }

    function assertPriceParamsAreBounded() internal {
        ensureGreaterEqual(baseLimit, baseLimitMin, "baseLimit", "baseLimitMin");
        ensureLessEqual(baseLimit, baseLimitMax, "baseLimit", "baseLimitMax");
        ensureGreaterEqual(quoteOffset, quoteOffsetMin, "quoteOffset", "quoteOffsetMin");
        ensureLessEqual(quoteOffset, quoteOffsetMax, "quoteOffset", "quoteOffsetMax");
    }

    function assertAllUsersHaveFees() internal {
        logArray(holders, "holders");
        for (uint i = 0; i < holders.length; i++) {
            log('balanceOf(holders[i])', balanceOf(holders[i]));
            ensureGreater(fees[holders[i]], 0, string.concat("fees[holders[", toString(i), "]]"), "0");
        }
        ensureEqual(fees[address(0)], 0, "fees[address(0)]", "0");
    }

    function assertContractBalanceIsCorrect() internal {
        uint sumOfFeesOfHolders = sum(holders, fees);
        uint sumOfFeesPreallocations = preallocation * holders.length;
        uint expectedBalance = quoteSupply + sumOfFeesOfHolders - sumOfFeesPreallocations;
        // NOTE: Using ensureGreaterEqual instead of ensureEqual because if the sender sells his full balance, he is no longer included in holders, so sumOfFeesOfHolders will not include his fee
        ensureGreaterEqual(address(this).balance, expectedBalance, "address(this).balance", "quoteSupply + sumOfFees - sumOfPreallocations");
    }

    function assertSumOfBuysIsAlmostEqualToBigBuy() internal {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.baseSupply = totalSupply();
        prev.quoteSupply = quoteSupply;

        //        console.log('slope', slope);
//        console.log('weight', weight);
//        console.log('---');
        uint quoteDeltaProposed = 100000000000;
        (uint baseDeltaAll, uint quoteDeltaAll) = getBuyDeltas(quoteDeltaProposed);
        uint quoteDeltaSum;
        uint baseDeltaSum;
        uint denominator = 10;
        uint quoteDeltaProposedFraction = quoteDeltaProposed / denominator;
        for (uint i = 0; i < denominator; i++) {
            (uint baseDeltaFraction, uint quoteDeltaFraction) = getBuyDeltas(quoteDeltaProposedFraction);
            _mint(sender, baseDeltaFraction); // increment totalSupply
            quoteSupply += quoteDeltaFraction; // increment quoteSupply
            baseDeltaSum += baseDeltaFraction;
            quoteDeltaSum += quoteDeltaFraction;
        }
        _burn(sender, baseDeltaSum); // rollback totalSupply
        quoteSupply -= quoteDeltaSum; // rollback quoteSupply
        next.baseSupply = totalSupply();
        next.quoteSupply = quoteSupply;
//        console.log('baseDeltaFull', baseDeltaAll);
//        console.log('baseDeltaPart', baseDeltaSum);
//        console.log('--- === ---');
        ensureEqual(prev.baseSupply, next.baseSupply, "prev.baseSupply", "next.baseSupply");
        ensureEqual(prev.quoteSupply, next.quoteSupply, "prev.quoteSupply", "next.quoteSupply");
        ensureLessEqual(baseDeltaSum, baseDeltaAll, "baseDeltaSum", "baseDeltaAll");
        ensureLessEqual(quoteDeltaSum, quoteDeltaAll, "quoteDeltaSum", "quoteDeltaAll");
    }

    // Must be overridden to prevent Echidna from reporting an overflow (there's no explicit revert in ERC20 because it relies on automatic overflow checking)
    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        checkAllowance(spender, addedValue, allowance(msg.sender, spender));
        return super.increaseAllowance(spender, addedValue);
    }

    function getShareRootEffective(address recipient) internal view returns (uint) {
        (bool found, uint index) = getRecipientIndex(recipient);
        if (!found) return 0;
        require(false, "Implement getShareRootEffective");
//        return found ? shares[index][SharePath.root] : 0;
    }

    function getShare(address recipient) internal view returns (uint) {
        (bool found, uint index) = getRecipientIndex(recipient);
        return found ? shares[index][uint(SharePath.root)] : 0;
    }

    function getRecipientIndex(address recipient) internal view returns (bool, uint) {
        for (uint i; i < recipients.length; i++) {
            if (recipients[i] == recipient) {
                return (true, i);
            }
        }
        return (false, 0);
    }

}
