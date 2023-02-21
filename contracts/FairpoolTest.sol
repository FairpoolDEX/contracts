// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./FairpoolOwnerOperator.sol";
import "./IncreaseAllowanceHooks.sol";
//import "./Util.sol";

contract FairpoolTest is FairpoolOwnerOperator, IncreaseAllowanceHooks, Util {
    address payable[] $beneficiaries;
    uint[] $shares;
    uint8 constant $precision = 18;
    uint constant $baseLimit = 1000;
    uint constant $quoteOffset = 2000;
    uint constant $fees = scaleOfShares * 25 / 1000;
    uint constant $royalties = scaleOfShares / 2 - $fees;
    uint constant $earnings = scaleOfShares / 2 - 1;

    constructor() FairpoolOwnerOperator("FairpoolTest", "FTS", $baseLimit, $quoteOffset, $precision, $royalties, $earnings, $beneficiaries, $shares) {
        // weight and tax can be changed via reset()
        // beneficiaries and shares can be changed via transferShares()
        operator = payable(msg.sender); // allow the owner to receive the fees & call setOperator()
        setTaxesInternal($royalties, $earnings, $fees);
    }

    // allow testing different combinations of contract parameters
    // use baseLimitNew * initialPriceNew instead of quoteOffsetNew to improve the probability of passing the validations in setCurveParametersInternal
    function reset(uint128 baseLimitNew, uint128 initialPriceNew, uint royaltiesNew, uint earningsNew, uint feesNew) public onlyOperator {
        // need to copy holders because it's modified in the loop body via _burn()
        address[] memory $holders = copy(holders);
        for (uint i = 0; i < $holders.length; i++) {
            _burn($holders[i], balanceOf($holders[i]));
            delete tallies[$holders[i]];
        }
        // no need to copy beneficiaries because it's not modified in the loop body
        for (uint i = 0; i < beneficiaries.length; i++) {
            // set the tallies for beneficiaries (may have been deleted in the previous loop if a beneficiary was also a holder)
            preallocate(beneficiaries[i]);
        }
        payable(owner()).transfer(address(this).balance);
        quoteBalanceOfContract = 0;
        setCurveParametersInternal(uint(baseLimitNew), uint(baseLimitNew) * uint(initialPriceNew));
        setTaxesInternal(royaltiesNew, earningsNew, feesNew);
    }

    // msg.value is bounded by native currency supply
    function test() public {
        baseLimitIsBounded();
        quoteOffsetIsBounded();
        taxesAreBounded();
        allUsersHaveTallies();
        contractBalanceIsCorrect();
        sumOfBuysIsAlmostEqualToBigBuy();
    }

    // Using a struct to avoid the "stack too deep" error
    struct Vars {
        uint quoteBalanceOfContract;
        uint quoteBalanceOfContractReal;
        uint quoteBalanceOfContractCalculated;
        uint baseBalanceOfSender;
        uint quoteBalanceOfSender;
        uint quoteBalanceOfOperator;
        uint tallyOfSender;
        uint sumOfBalances;
        uint sumOfBalancesCalculated;
        uint sumOfTalliesOfHolders; // NOTE: This excludes beneficiaries without token balances
        address[] holders;
    }

    function buy(uint baseReceivedMin, uint deadline) public virtual override payable {
        // hardcode the parameters to minimize reverts
        //        baseReceiveMin = 0;
        //        deadline = type(uint).max;
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteBalanceOfContract = quoteBalanceOfContract;
        prev.quoteBalanceOfContractReal = address(this).balance - msg.value;
        prev.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance + msg.value;
        prev.quoteBalanceOfOperator = sender == operator ? sender.balance + msg.value : operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);

        super.buy(baseReceivedMin, deadline);

        next.quoteBalanceOfContract = quoteBalanceOfContract;
        next.quoteBalanceOfContractReal = address(this).balance;
        next.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = sender == operator ? sender.balance : operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);

        ensureGreaterEqual(next.quoteBalanceOfContractReal, prev.quoteBalanceOfContractReal, "next.quoteBalanceOfContractReal", "prev.quoteBalanceOfContractReal");
        ensureGreaterEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");

        uint diffQuoteBalanceOfContractReal = next.quoteBalanceOfContractReal - prev.quoteBalanceOfContractReal;
        uint diffBaseBalanceOfSender = next.baseBalanceOfSender - prev.baseBalanceOfSender;

        ensureGreaterEqual(diffBaseBalanceOfSender, baseReceivedMin, "diffBaseBalanceOfSender", "baseReceiveMin");
        ensureGreater(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (sender == operator) {
            ensureLess(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        } else {
            ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        }
        ensureGreaterEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureGreater(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        ensureGreaterEqual(next.sumOfTalliesOfHolders, prev.sumOfTalliesOfHolders, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureGreaterEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureLessEqual(diffQuoteBalanceOfContractReal, msg.value, "diffQuoteBalanceOfContractReal", "msg.value");
        ensureLessEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractReal, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractReal");
        ensureLessEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractReal, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractReal");
        ensureEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractCalculated, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractCalculated");
        ensureEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractCalculated, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractCalculated");
        ensureGreaterEqual(prev.sumOfBalances, prev.sumOfBalancesCalculated, "prev.sumOfBalances", "prev.sumOfBalancesCalculated");
        ensureGreaterEqual(next.sumOfBalances, next.sumOfBalancesCalculated, "next.sumOfBalances", "next.sumOfBalancesCalculated");
        // `quoteBalanceOfContract == 0` if and only if `next.sumOfBalances == 0`
        ensureEqual(next.quoteBalanceOfContract == 0, next.sumOfBalances == 0, "next.quoteBalanceOfContract == 0", "next.sumOfBalances == 0");
    }

    function sell(uint baseDeltaProposed, uint quoteReceivedMin, uint deadline) public virtual override returns (uint quoteDistributed) {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteBalanceOfContract = quoteBalanceOfContract;
        prev.quoteBalanceOfContractReal = address(this).balance;
        prev.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOperator = operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);

        quoteDistributed = super.sell(baseDeltaProposed, quoteReceivedMin, deadline);
        ensureNotEqual(quoteDistributed, 0, "quoteDistributed", "0"); // because deltaQuote is always divisible by scale without remainder

        next.quoteBalanceOfContract = quoteBalanceOfContract;
        next.quoteBalanceOfContractReal = address(this).balance;
        next.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);

        ensureLessEqual(next.quoteBalanceOfContractReal, prev.quoteBalanceOfContractReal, "next.quoteBalanceOfContractReal", "prev.quoteBalanceOfContractReal");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLessEqual(next.tallyOfSender, 1, "next.tallyOfSender", "delta"); // because tallyOfSender can be either 0 or 1 (if balanceOfSender == 0 or balanceOfSender != 0)

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.quoteBalanceOfContractReal - next.quoteBalanceOfContractReal;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;

        ensureGreaterEqual(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureLessEqual(neg_diffBaseBalanceOfSender, baseDeltaProposed, "neg_diffBaseBalanceOfSender", "baseDeltaProposed");
        ensureGreaterEqual(diffQuoteBalanceOfSender, quoteReceivedMin, "diffQuoteBalanceOfSender", "quoteReceivedMin");
        ensureLess(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (msg.sender == operator) {
            // next.quoteBalanceOfOperator can have any relationship with prev.quoteBalanceOfOperator
        } else {
            if (fees == 0) {
                ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
            } else {
                ensureGreater(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
            }
        }
        ensureLessEqual(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureLess(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        // next.sumOfTallies can have any relationship with prev.sumOfTallies // ensureAny(next.sumOfTallies, prev.sumOfTallies, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureLessEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        // [sender may have sold the full amount, so not checking ensureIncludes(next.holders, sender)] ensureIncludes(next.holders, sender, "next.holders", "sender");
        ensureLessEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractReal, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractReal");
        ensureLessEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractReal, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractReal");
        ensureEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractCalculated, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractCalculated");
        ensureEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractCalculated, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractCalculated");
        ensureGreaterEqual(prev.sumOfBalances, prev.sumOfBalancesCalculated, "prev.sumOfBalances", "prev.sumOfBalancesCalculated");
        ensureGreaterEqual(next.sumOfBalances, next.sumOfBalancesCalculated, "next.sumOfBalances", "next.sumOfBalancesCalculated");
        // `quoteBalanceOfContract == 0` if and only if `next.sumOfBalances == 0`
        ensureEqual(next.quoteBalanceOfContract == 0, next.sumOfBalances == 0, "next.quoteBalanceOfContract == 0", "next.sumOfBalances == 0");
    }

    function withdraw() public virtual override {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.quoteBalanceOfContract = quoteBalanceOfContract;
        prev.quoteBalanceOfContractReal = address(this).balance;
        prev.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        prev.baseBalanceOfSender = balanceOf(sender);
        prev.quoteBalanceOfSender = sender.balance;
        prev.quoteBalanceOfOperator = operator.balance;
        prev.tallyOfSender = tallies[sender];
        prev.sumOfBalances = totalSupply();
        prev.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        prev.sumOfTalliesOfHolders = sum(holders, tallies);
        prev.holders = getOld(holders);

        super.withdraw();

        next.quoteBalanceOfContract = quoteBalanceOfContract;
        next.quoteBalanceOfContractReal = address(this).balance;
        next.quoteBalanceOfContractCalculated = getQuoteSupply(totalSupply());
        next.baseBalanceOfSender = balanceOf(sender);
        next.quoteBalanceOfSender = sender.balance;
        next.quoteBalanceOfOperator = operator.balance;
        next.tallyOfSender = tallies[sender];
        next.sumOfBalances = totalSupply();
        next.sumOfBalancesCalculated = getBaseSupply(quoteBalanceOfContract);
        next.sumOfTalliesOfHolders = sum(holders, tallies);
        next.holders = getNew(holders);

        ensureLessEqual(next.quoteBalanceOfContractReal, prev.quoteBalanceOfContractReal, "next.quoteBalanceOfContractReal", "prev.quoteBalanceOfContractReal");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");

        // neg_ values are calculated with inverted order of next & prev
        uint neg_diffBalanceOfContract = prev.quoteBalanceOfContractReal - next.quoteBalanceOfContractReal;
        uint neg_diffBaseBalanceOfSender = prev.baseBalanceOfSender - next.baseBalanceOfSender;
        uint diffQuoteBalanceOfSender = next.quoteBalanceOfSender - prev.quoteBalanceOfSender;
        uint neg_diffTallyOfSender = prev.tallyOfSender - next.tallyOfSender;

        ensureGreater(neg_diffBalanceOfContract, 0, "neg_diffBalanceOfContract", "0");
        ensureEqual(neg_diffBaseBalanceOfSender, 0, "neg_diffBaseBalanceOfSender", "0");
        ensureGreaterEqual(neg_diffBalanceOfContract, diffQuoteBalanceOfSender, "neg_diffBalanceOfContract", "diffQuoteBalanceOfSender");
        ensureGreaterEqual(neg_diffTallyOfSender, prev.tallyOfSender - defaultTally, "diffTallyOfSender", "quoteReceivedMin");
        ensureLessEqual(next.tallyOfSender, 1, "next.tallyOfSender", "delta");
        ensureEqual(next.baseBalanceOfSender, prev.baseBalanceOfSender, "next.baseBalanceOfSender", "prev.baseBalanceOfSender");
        ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender, "next.quoteBalanceOfSender", "prev.quoteBalanceOfSender");
        if (msg.sender == operator) {
            // this assertion is redundant, because we already check ensureGreater(next.quoteBalanceOfSender, prev.quoteBalanceOfSender), but we'll leave it for completeness
            ensureGreater(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        } else {
            ensureEqual(next.quoteBalanceOfOperator, prev.quoteBalanceOfOperator, "next.quoteBalanceOfOperator", "prev.quoteBalanceOfOperator");
        }
        ensureLess(next.tallyOfSender, prev.tallyOfSender, "next.tallyOfSender", "prev.tallyOfSender");
        ensureEqual(next.sumOfBalances, prev.sumOfBalances, "next.sumOfBalances", "prev.sumOfBalances");
        ensureLessEqual(next.sumOfTalliesOfHolders, prev.sumOfTalliesOfHolders, "next.sumOfTalliesOfHolders", "prev.sumOfTalliesOfHolders");
        ensureEqual(next.holders.length, prev.holders.length, "next.holders.length", "prev.holders.length");
        ensureLessEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractReal, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractReal");
        ensureLessEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractReal, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractReal");
        ensureEqual(prev.quoteBalanceOfContract, prev.quoteBalanceOfContractCalculated, "prev.quoteBalanceOfContract", "prev.quoteBalanceOfContractCalculated");
        ensureEqual(next.quoteBalanceOfContract, next.quoteBalanceOfContractCalculated, "next.quoteBalanceOfContract", "next.quoteBalanceOfContractCalculated");
        ensureGreaterEqual(prev.sumOfBalances, prev.sumOfBalancesCalculated, "prev.sumOfBalances", "prev.sumOfBalancesCalculated");
        ensureGreaterEqual(next.sumOfBalances, next.sumOfBalancesCalculated, "next.sumOfBalances", "next.sumOfBalancesCalculated");
        // `quoteBalanceOfContract == 0` if and only if `next.sumOfBalances == 0`
        ensureEqual(next.quoteBalanceOfContract == 0, next.sumOfBalances == 0, "next.quoteBalanceOfContract == 0", "next.sumOfBalances == 0");
    }

    function baseLimitIsBounded() internal {
        ensureGreaterEqual(baseLimit, baseLimitMin, "baseLimit", "baseLimitMin");
        ensureLessEqual(baseLimit, baseLimitMax, "baseLimit", "baseLimitMax");
    }

    function quoteOffsetIsBounded() internal {
        ensureGreaterEqual(quoteOffset, quoteOffsetMin, "quoteOffset", "quoteOffsetMin");
        ensureLessEqual(quoteOffset, quoteOffsetMax, "quoteOffset", "quoteOffsetMax");
    }

    function taxesAreBounded() internal {
        // tax == 0 is ok
        ensureLessEqual(royalties + earnings + fees, scaleOfShares, "royalties + earnings + fees", "scaleOfShares");
    }

    function allUsersHaveTallies() internal {
        logArray(holders, "holders");
        for (uint i = 0; i < holders.length; i++) {
            log('balanceOf(holders[i])', balanceOf(holders[i]));
            ensureGreater(tallies[holders[i]], 0, string.concat("tallies[holders[", toString(i), "]]"), "0");
        }
        for (uint i = 0; i < beneficiaries.length; i++) {
            log('balanceOf(beneficiaries[i])', balanceOf(beneficiaries[i]));
            ensureGreater(tallies[beneficiaries[i]], 0, string.concat("tallies[beneficiaries[", toString(i), "]]"), "0");
        }
        ensureEqual(tallies[address(0)], 0, "tallies[address(0)]", "0");
    }

    function contractBalanceIsCorrect() internal {
        uint sumOfTalliesOfHolders = sum(holders, tallies);
        uint sumOfPreallocations = defaultTally * holders.length;
        uint expectedBalance = quoteBalanceOfContract + sumOfTalliesOfHolders - sumOfPreallocations;
        // NOTE: Using GreaterEqual instead of Equal because if the sender sells his full balance, he is no longer included in holders, so sumOfTalliesOfHolders will not include his tally
        ensureGreaterEqual(address(this).balance, expectedBalance, "address(this).balance", "quoteBalanceOfContract + sumOfTallies - sumOfPreallocations");
    }

    function sumOfBuysIsAlmostEqualToBigBuy() internal {
        Vars memory prev;
        Vars memory next;
        address sender = _msgSender();

        prev.sumOfBalances = totalSupply();
        prev.quoteBalanceOfContract = quoteBalanceOfContract;

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
            quoteBalanceOfContract += quoteDeltaFraction; // increment quoteBalanceOfContract
            baseDeltaSum += baseDeltaFraction;
            quoteDeltaSum += quoteDeltaFraction;
        }
        _burn(sender, baseDeltaSum); // rollback totalSupply
        quoteBalanceOfContract -= quoteDeltaSum; // rollback quoteBalanceOfContract
        next.sumOfBalances = totalSupply();
        next.quoteBalanceOfContract = quoteBalanceOfContract;
//        console.log('baseDeltaFull', baseDeltaAll);
//        console.log('baseDeltaPart', baseDeltaSum);
//        console.log('--- === ---');
        ensureEqual(prev.sumOfBalances, next.sumOfBalances, "prev.sumOfBalances", "next.sumOfBalances");
        ensureEqual(prev.quoteBalanceOfContract, next.quoteBalanceOfContract, "prev.quoteBalanceOfContract", "next.quoteBalanceOfContract");
        ensureLessEqual(baseDeltaSum, baseDeltaAll, "baseDeltaSum", "baseDeltaAll");
        ensureLessEqual(quoteDeltaSum, quoteDeltaAll, "quoteDeltaSum", "quoteDeltaAll");
    }

    // Must be overridden to prevent Echidna from reporting an overflow (there's no explicit revert in ERC20 because it relies on automatic overflow checking)
    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        checkAllowance(spender, addedValue, allowance(msg.sender, spender));
        return super.increaseAllowance(spender, addedValue);
    }

}
