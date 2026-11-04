// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {iMONVault} from "../src/iMONVault.sol";
import {IRateReader} from "../src/interfaces/IRateReader.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockRateReader} from "./mocks/MockRateReader.sol";

contract iMONVaultTest is Test {
    iMONVault internal vault;
    MockRateReader internal reader;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 internal constant ONE = 1e18;

    function setUp() public {
        reader = new MockRateReader();
        tokenA = new MockERC20("Mock shMON", "shMON");
        tokenB = new MockERC20("Mock gMON", "gMON");
        reader.setRate(address(tokenA), ONE);
        reader.setRate(address(tokenB), ONE);

        vault = new iMONVault("iMON Index", "iMON", IRateReader(address(reader)), address(this));
        vault.addAsset(address(tokenA));
        vault.addAsset(address(tokenB));

        tokenA.mint(alice, 1_000_000 ether);
        tokenB.mint(alice, 1_000_000 ether);
        tokenA.mint(bob, 1_000_000 ether);
        tokenB.mint(bob, 1_000_000 ether);

        vm.startPrank(alice);
        tokenA.approve(address(vault), type(uint256).max);
        tokenB.approve(address(vault), type(uint256).max);
        vm.stopPrank();
        vm.startPrank(bob);
        tokenA.approve(address(vault), type(uint256).max);
        tokenB.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function _deposit(address who, MockERC20 t, uint256 amt) internal returns (uint256) {
        vm.prank(who);
        return vault.deposit(address(t), amt, who);
    }

    function test_FirstDeposit() public {
        uint256 shares = _deposit(alice, tokenA, 100 ether);
        assertEq(shares, 100 ether * 1000, "first shares = value * 10**offset");
        assertEq(vault.balanceOf(alice), shares);
        assertEq(vault.vaultBalance(address(tokenA)), 100 ether);
        assertEq(vault.nav(), 100 ether);
        assertEq(vault.balanceOf(DEAD), 1000, "dead shares locked on first deposit");
    }

    function test_SecondDepositorFair() public {
        uint256 aShares = _deposit(alice, tokenA, 100 ether);
        uint256 bShares = _deposit(bob, tokenA, 100 ether);
        assertApproxEqRel(bShares, aShares, 0.0001e18, "equal-value deposits get ~equal shares");
    }

    function test_RoundTripNoProfit() public {
        uint256 shares = _deposit(alice, tokenA, 100 ether);
        vm.prank(alice);
        (address[] memory a, uint256[] memory amts) = vault.redeem(shares, alice);
        assertEq(a[0], address(tokenA));
        assertLe(amts[0], 100 ether, "cannot withdraw more than deposited");
        assertApproxEqAbs(amts[0], 100 ether, 1e6, "~full minus negligible dust");
    }

    function test_DonationDoesNotInflate() public {
        uint256 aShares = _deposit(alice, tokenA, 100 ether);
        // Attacker donates tokens straight to the vault.
        tokenA.mint(address(this), 1000 ether);
        require(tokenA.transfer(address(vault), 1000 ether), "donate failed");
        assertEq(vault.nav(), 100 ether, "donation ignored by internal accounting");
        uint256 bShares = _deposit(bob, tokenA, 100 ether);
        assertApproxEqRel(bShares, aShares, 0.0001e18, "donation cannot steal from the next depositor");
    }

    function test_YieldRaisesNav() public {
        _deposit(alice, tokenA, 100 ether);
        uint256 npsBefore = vault.navPerShare();
        reader.setRate(address(tokenA), 1.1e18); // +10% staking yield
        assertEq(vault.nav(), 110 ether);
        uint256 npsAfter = vault.navPerShare();
        assertApproxEqRel(npsAfter, npsBefore * 110 / 100, 0.0001e18);
    }

    function test_MultiAssetNav() public {
        // ≤30% caps require ≥4 sleeves; seed equal weights at 25%.
        MockERC20 tokenC = new MockERC20("c", "c");
        MockERC20 tokenD = new MockERC20("d", "d");
        reader.setRate(address(tokenC), ONE);
        reader.setRate(address(tokenD), ONE);
        vault.addAsset(address(tokenC));
        vault.addAsset(address(tokenD));
        tokenC.mint(alice, 1_000 ether);
        tokenD.mint(alice, 1_000 ether);
        vm.startPrank(alice);
        tokenC.approve(address(vault), type(uint256).max);
        tokenD.approve(address(vault), type(uint256).max);
        vm.stopPrank();

        address[] memory assetsIn = new address[](4);
        uint256[] memory amts = new uint256[](4);
        assetsIn[0] = address(tokenA);
        assetsIn[1] = address(tokenB);
        assetsIn[2] = address(tokenC);
        assetsIn[3] = address(tokenD);
        amts[0] = 100 ether;
        amts[1] = 100 ether;
        amts[2] = 100 ether;
        amts[3] = 100 ether;
        vm.prank(alice);
        vault.depositMany(assetsIn, amts, alice);
        assertEq(vault.nav(), 400 ether);
    }

    function test_RedeemReturnsAllAssets() public {
        MockERC20 tokenC = new MockERC20("c", "c");
        MockERC20 tokenD = new MockERC20("d", "d");
        reader.setRate(address(tokenC), ONE);
        reader.setRate(address(tokenD), ONE);
        vault.addAsset(address(tokenC));
        vault.addAsset(address(tokenD));
        tokenC.mint(alice, 1_000 ether);
        tokenD.mint(alice, 1_000 ether);
        vm.startPrank(alice);
        tokenC.approve(address(vault), type(uint256).max);
        tokenD.approve(address(vault), type(uint256).max);
        vm.stopPrank();

        address[] memory assetsIn = new address[](4);
        uint256[] memory seedAmts = new uint256[](4);
        assetsIn[0] = address(tokenA);
        assetsIn[1] = address(tokenB);
        assetsIn[2] = address(tokenC);
        assetsIn[3] = address(tokenD);
        seedAmts[0] = 100 ether;
        seedAmts[1] = 100 ether;
        seedAmts[2] = 100 ether;
        seedAmts[3] = 100 ether;
        vm.prank(alice);
        vault.depositMany(assetsIn, seedAmts, alice);
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        (address[] memory outA, uint256[] memory outAmts) = vault.redeem(shares, alice);
        assertEq(outA.length, 4);
        assertGt(outAmts[0], 0, "returns token A");
        assertGt(outAmts[1], 0, "returns token B");
    }

    function test_ZeroAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert(iMONVault.ZeroAmount.selector);
        vault.deposit(address(tokenA), 0, alice);
    }

    function test_ZeroSharesReverts() public {
        MockERC20 tokenC = new MockERC20("Mock cMON", "cMON");
        reader.setRate(address(tokenC), 1e17); // 0.1 MON per token
        vault.addAsset(address(tokenC));
        tokenC.mint(alice, 1 ether);
        vm.startPrank(alice);
        tokenC.approve(address(vault), type(uint256).max);
        // 1 wei * 1e17 / 1e18 = 0 MON value -> 0 shares -> revert (before any transfer)
        vm.expectRevert(iMONVault.ZeroShares.selector);
        vault.deposit(address(tokenC), 1, alice);
        vm.stopPrank();
    }

    function test_UnsupportedAssetReverts() public {
        MockERC20 bad = new MockERC20("bad", "bad");
        bad.mint(alice, 1 ether);
        vm.startPrank(alice);
        bad.approve(address(vault), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(iMONVault.NotAsset.selector, address(bad)));
        vault.deposit(address(bad), 1 ether, alice);
        vm.stopPrank();
    }

    function test_OnlyOwnerAddAsset() public {
        MockERC20 t = new MockERC20("t", "t");
        reader.setRate(address(t), ONE);
        vm.prank(alice);
        vm.expectRevert();
        vault.addAsset(address(t));
    }

    function test_RedeemMoreThanBalanceReverts() public {
        uint256 shares = _deposit(alice, tokenA, 100 ether);
        vm.prank(alice);
        vm.expectRevert();
        vault.redeem(shares + 1, alice);
    }

    function test_PreviewMatchesDeposit() public {
        uint256 preview = vault.previewDeposit(address(tokenA), 100 ether);
        uint256 actual = _deposit(alice, tokenA, 100 ether);
        assertEq(preview, actual, "preview must equal the realized mint");
    }

    function testFuzz_RoundTrip(uint256 amt) public {
        amt = bound(amt, 1e9, 1_000_000 ether);
        uint256 shares = _deposit(alice, tokenA, amt);
        vm.prank(alice);
        (, uint256[] memory amts) = vault.redeem(shares, alice);
        assertLe(amts[0], amt, "no free value out");
        assertApproxEqRel(amts[0], amt, 0.001e18, "~full round-trip minus dust");
    }
}
