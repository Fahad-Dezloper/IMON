// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {YieldOracle} from "../src/YieldOracle.sol";
import {iMONVault} from "../src/iMONVault.sol";
import {IRateReader} from "../src/interfaces/IRateReader.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockRateReader} from "./mocks/MockRateReader.sol";

contract YieldOracleTest is Test {
    YieldOracle internal oracle;
    MockRateReader internal reader;
    MockERC20 internal a;
    MockERC20 internal b;
    MockERC20 internal c;
    MockERC20 internal d;
    iMONVault internal vault;
    address internal alice = makeAddr("alice");

    function setUp() public {
        reader = new MockRateReader();
        a = new MockERC20("a", "A");
        b = new MockERC20("b", "B");
        c = new MockERC20("c", "C");
        d = new MockERC20("d", "D");
        reader.setRate(address(a), 1e18);
        reader.setRate(address(b), 1e18);
        reader.setRate(address(c), 1e18);
        reader.setRate(address(d), 1e18);

        oracle = new YieldOracle(address(this), IRateReader(address(reader)));
        vault = new iMONVault("iMON", "iMON", IRateReader(address(reader)), address(this));
        vault.addAsset(address(a));
        vault.addAsset(address(b));
        vault.addAsset(address(c));
        vault.addAsset(address(d));
        vault.setYieldOracle(oracle);

        for (uint256 i; i < 4; ++i) {
            MockERC20 t = i == 0 ? a : i == 1 ? b : i == 2 ? c : d;
            t.mint(alice, 1_000_000 ether);
            vm.prank(alice);
            t.approve(address(vault), type(uint256).max);
        }
    }

    function _seedEqual() internal {
        address[] memory assetsIn = new address[](4);
        uint256[] memory amts = new uint256[](4);
        assetsIn[0] = address(a);
        assetsIn[1] = address(b);
        assetsIn[2] = address(c);
        assetsIn[3] = address(d);
        amts[0] = 100 ether;
        amts[1] = 100 ether;
        amts[2] = 100 ether;
        amts[3] = 100 ether;
        vm.prank(alice);
        vault.depositMany(assetsIn, amts, alice);
    }

    function test_AprTracksRateGrowth() public {
        oracle.record(address(a));
        vm.warp(block.timestamp + 365 days);
        reader.setRate(address(a), 1.1e18);
        int256 apr = oracle.record(address(a));
        assertApproxEqAbs(apr, int256(1000), 5);
        assertTrue(oracle.hasApr(address(a)));
    }

    function test_PreferredAsset_IsHighestAprWithHeadroom() public {
        _seedEqual();
        oracle.record(address(a));
        oracle.record(address(b));
        oracle.record(address(c));
        oracle.record(address(d));
        vm.warp(block.timestamp + 30 days);
        reader.setRate(address(a), 1.05e18);
        reader.setRate(address(b), 1.01e18);
        reader.setRate(address(c), 1.01e18);
        reader.setRate(address(d), 1.01e18);
        oracle.record(address(a));
        oracle.record(address(b));
        oracle.record(address(c));
        oracle.record(address(d));

        (address best, int256 apr) = vault.preferredDepositAsset();
        assertEq(best, address(a));
        assertGt(apr, 0);
    }

    function test_CapsBlockOverAllocation() public {
        _seedEqual(); // 25% each
        // Push A from 25% toward >30%: A=100, nav=400 → need x where (100+x)/(400+x) > 0.3 → x > 28.57
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(iMONVault.CapExceeded.selector, address(a)));
        vault.deposit(address(a), 30 ether, alice);
    }

    function test_LiveAprOverridesTrailingForRouting() public {
        _seedEqual();
        // Trailing: B grows more
        oracle.record(address(a));
        oracle.record(address(b));
        vm.warp(block.timestamp + 30 days);
        reader.setRate(address(a), 1.01e18);
        reader.setRate(address(b), 1.10e18);
        oracle.record(address(a));
        oracle.record(address(b));

        // Live push says A is best
        oracle.pushLiveApr(address(a), 1500); // 15%
        oracle.pushLiveApr(address(b), 500); // 5%

        (address best, int256 apr) = vault.preferredDepositAsset();
        assertEq(best, address(a));
        assertEq(apr, int256(1500));
        assertEq(oracle.effectiveAprBps(address(a)), int256(1500));
    }
}
