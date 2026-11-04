// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShMONRateAdapter} from "../src/adapters/ShMONRateAdapter.sol";
import {ERC4626RateAdapter} from "../src/adapters/ERC4626RateAdapter.sol";
import {RateReader} from "../src/RateReader.sol";
import {IRateAdapter} from "../src/interfaces/IRateAdapter.sol";

/// @notice Mainnet-fork smoke tests against real LST contracts (read-only, no funds).
/// @dev Run with: forge test --match-path test/ShMONFork.t.sol --fork-url https://rpc.monad.xyz
contract ShMONForkTest is Test {
    address internal constant SHMON = 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c;
    address internal constant APRMON = 0x0c65A0BC65a5D819235B71F554D210D3F80E0852;
    address internal constant GMON = 0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081;

    modifier onlyMonadFork() {
        if (block.chainid != 143) {
            vm.skip(true);
        }
        // Confirm bytecode exists (guards against a wrong RPC).
        if (SHMON.code.length == 0) {
            vm.skip(true);
        }
        _;
    }

    function testFork_ShMON_RateInSaneBand() public onlyMonadFork {
        ShMONRateAdapter adapter = new ShMONRateAdapter(SHMON);
        (uint256 rate, uint256 updatedAt) = adapter.readRate();

        // Confirmed live ~1.64 MON/shMON at research time; band leaves room for yield accrual.
        assertGt(rate, 1e18, "shMON should be > 1 MON (accrued yield)");
        assertLt(rate, 3e18, "shMON rate sanity upper bound");
        assertEq(updatedAt, block.timestamp);
        assertEq(adapter.asset(), SHMON);

        // Unstake quote (with fee) must be <= convertToAssets equity.
        uint256 unstake = adapter.unstakeQuote(1e18);
        assertLe(unstake, rate, "previewRedeem haircuts vs convertToAssets");
        assertGt(unstake, 1e18, "unstake quote still > 1 MON");
    }

    function testFork_ShMON_RateReaderGuards() public onlyMonadFork {
        ShMONRateAdapter adapter = new ShMONRateAdapter(SHMON);
        RateReader reader = new RateReader(address(this));
        reader.setAdapter(
            SHMON,
            IRateAdapter(address(adapter)),
            RateReader.GuardConfig({
                maxAge: 1 days,
                maxDeviationBps: 1000, // 10% — wide for a smoke poke
                maxDropBps: 500
            })
        );

        uint256 rate = reader.rateOf(SHMON);
        assertGt(rate, 1e18);
        assertLt(rate, 3e18);

        uint256 poked = reader.poke(SHMON);
        assertEq(poked, rate);
        // Second read within band still works.
        assertEq(reader.rateOf(SHMON), rate);
    }

    function testFork_AprMON_ERC4626Adapter() public onlyMonadFork {
        if (APRMON.code.length == 0) vm.skip(true);
        ERC4626RateAdapter adapter = new ERC4626RateAdapter(APRMON);
        (uint256 rate,) = adapter.readRate();
        assertGt(rate, 1e18);
        assertLt(rate, 3e18);
    }

    function testFork_GMON_ERC4626Adapter() public onlyMonadFork {
        if (GMON.code.length == 0) vm.skip(true);
        ERC4626RateAdapter adapter = new ERC4626RateAdapter(GMON);
        (uint256 rate,) = adapter.readRate();
        assertGt(rate, 1e18);
        assertLt(rate, 3e18);
    }
}
