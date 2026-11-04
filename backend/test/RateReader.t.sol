// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RateReader} from "../src/RateReader.sol";
import {IRateAdapter} from "../src/interfaces/IRateAdapter.sol";
import {MockRateAdapter} from "./mocks/MockRateAdapter.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {iMONVault} from "../src/iMONVault.sol";
import {IRateReader} from "../src/interfaces/IRateReader.sol";

contract RateReaderTest is Test {
    RateReader internal reader;
    MockRateAdapter internal adapter;
    MockERC20 internal lst;
    address internal alice = makeAddr("alice");

    uint64 internal constant MAX_AGE = 1 days;
    uint16 internal constant MAX_DEV_BPS = 500; // 5%
    uint16 internal constant MAX_DROP_BPS = 300; // 3% sharp drop → flag

    function setUp() public {
        lst = new MockERC20("MockLST", "mLST");
        reader = new RateReader(address(this));
        adapter = new MockRateAdapter(address(lst), 1e18);
        reader.setAdapter(
            address(lst),
            IRateAdapter(address(adapter)),
            RateReader.GuardConfig({maxAge: MAX_AGE, maxDeviationBps: MAX_DEV_BPS, maxDropBps: MAX_DROP_BPS})
        );
    }

    function test_RateOf_BeforePoke_AllowsBootstrap() public view {
        assertEq(reader.rateOf(address(lst)), 1e18);
    }

    function test_Poke_ThenYieldWithinBand() public {
        reader.poke(address(lst));
        adapter.setRate(1.04e18); // +4% < 5% deviation
        assertEq(reader.rateOf(address(lst)), 1.04e18);
        reader.poke(address(lst));
        (uint256 lastRate,,,) = _state();
        assertEq(lastRate, 1.04e18);
    }

    function test_RevertWhen_DeviationExceeded() public {
        reader.poke(address(lst));
        adapter.setRate(1.06e18); // +6% > 5%
        vm.expectRevert(
            abi.encodeWithSelector(RateReader.DeviationExceeded.selector, address(lst), uint256(1e18), uint256(1.06e18))
        );
        reader.rateOf(address(lst));
    }

    function test_RevertWhen_Stale() public {
        vm.warp(MAX_AGE * 2); // room to subtract without underflow
        adapter.setUpdatedAt(block.timestamp); // refresh so poke succeeds
        reader.poke(address(lst));

        uint256 staleTs = block.timestamp - MAX_AGE - 1;
        adapter.setUpdatedAt(staleTs);
        vm.expectRevert(abi.encodeWithSelector(RateReader.StaleRate.selector, address(lst), staleTs, uint256(MAX_AGE)));
        reader.rateOf(address(lst));
    }

    function test_MonotonicDrop_RevertsAndPokeFlags() public {
        reader.poke(address(lst));
        adapter.setRate(0.96e18); // -4% > 3% drop band

        vm.expectRevert(
            abi.encodeWithSelector(RateReader.MonotonicDrop.selector, address(lst), uint256(1e18), uint256(0.96e18))
        );
        reader.rateOf(address(lst));

        // poke records the drop and flags the asset
        reader.poke(address(lst));
        assertTrue(reader.isFlagged(address(lst)));

        vm.expectRevert(abi.encodeWithSelector(RateReader.AssetIsFlagged.selector, address(lst)));
        reader.rateOf(address(lst));
    }

    function test_Unflag_RestoresRateOf() public {
        reader.poke(address(lst));
        adapter.setRate(0.95e18);
        reader.poke(address(lst));
        assertTrue(reader.isFlagged(address(lst)));

        // Move rate back near checkpoint so guards pass after unflag.
        adapter.setRate(0.95e18);
        reader.unflag(address(lst));
        assertEq(reader.rateOf(address(lst)), 0.95e18);
    }

    function test_UnknownAsset_ReturnsZero() public {
        assertEq(reader.rateOf(makeAddr("nope")), 0);
    }

    function test_OnlyOwnerSetAdapter() public {
        MockRateAdapter other = new MockRateAdapter(address(lst), 1e18);
        vm.prank(alice);
        vm.expectRevert();
        reader.setAdapter(
            address(lst),
            IRateAdapter(address(other)),
            RateReader.GuardConfig({maxAge: MAX_AGE, maxDeviationBps: MAX_DEV_BPS, maxDropBps: MAX_DROP_BPS})
        );
    }

    /// @notice Simulated yield: NAV tracks rate increase through the real vault path.
    function test_VaultNavTracksYield_ViaRateReader() public {
        reader.poke(address(lst));

        iMONVault vault = new iMONVault("iMON", "iMON", IRateReader(address(reader)), address(this));
        vault.addAsset(address(lst));

        lst.mint(alice, 100 ether);
        vm.startPrank(alice);
        lst.approve(address(vault), type(uint256).max);
        vault.deposit(address(lst), 100 ether, alice);
        vm.stopPrank();

        assertEq(vault.nav(), 100 ether);

        // +4% yield within deviation band; poke to advance checkpoint then raise further slowly
        adapter.setRate(1.04e18);
        assertEq(vault.nav(), 104 ether);
        reader.poke(address(lst));
    }

    /// @notice Simulated de-peg: deposit reverts on drop; redeem still works (no oracle).
    function test_DepegBlocksDeposit_RedeemStillWorks() public {
        reader.poke(address(lst));

        iMONVault vault = new iMONVault("iMON", "iMON", IRateReader(address(reader)), address(this));
        vault.addAsset(address(lst));

        lst.mint(alice, 200 ether);
        vm.startPrank(alice);
        lst.approve(address(vault), type(uint256).max);
        uint256 shares = vault.deposit(address(lst), 100 ether, alice);
        vm.stopPrank();

        adapter.setRate(0.9e18); // -10% crash
        reader.poke(address(lst)); // flags
        assertTrue(reader.isFlagged(address(lst)));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RateReader.AssetIsFlagged.selector, address(lst)));
        vault.deposit(address(lst), 1 ether, alice);

        // redeem never touches RateReader
        vm.prank(alice);
        (address[] memory a, uint256[] memory amts) = vault.redeem(shares, alice);
        assertEq(a[0], address(lst));
        assertGt(amts[0], 0);
    }

    function _state() internal view returns (uint256 lastRate, uint64 lastPoke, bool flagged, bool exists) {
        IRateAdapter adpt;
        RateReader.GuardConfig memory g;
        (adpt, g, lastRate, lastPoke, flagged, exists) = reader.assets(address(lst));
        adpt;
        g; // silence
    }
}
