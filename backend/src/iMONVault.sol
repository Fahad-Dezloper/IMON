// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IRateReader} from "./interfaces/IRateReader.sol";

/// @title iMONVault
/// @notice A capped, auto-balanced index of Monad liquid staking tokens. Deposit a
///         supported LST, mint `iMON` at net asset value (NAV, denominated in MON).
///         Redeem `iMON` for a pro-rata slice of the whole basket.
/// @dev Phase 1 scope: multi-asset share accounting, NAV, and the inflation/donation
///      defenses. Per-asset caps + guardian pause arrive in Phase 3; fees later. This is
///      intentionally NOT ERC-4626 (that standard is single-asset); it borrows 4626's
///      share math but holds a basket priced in MON.
///
///      Inflation/donation defense (three layers):
///        1. Virtual shares via a decimals OFFSET (empty-vault price is pinned).
///        2. Dead shares minted to a burn address on the first deposit.
///        3. Internal balance accounting — NAV reads `vaultBalance`, never
///           `token.balanceOf(this)`, so a raw token donation changes nothing.
contract iMONVault is ERC20, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint8 internal constant OFFSET = 3;
    uint256 internal constant VIRT_SHARES = 10 ** OFFSET; // 1000
    uint256 internal constant DEAD_SHARES = 1000;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 internal constant ONE = 1e18;

    /// @notice Source of MON-per-token rates for each basket asset.
    IRateReader public rateReader;

    /// @notice The ordered list of supported basket assets.
    address[] public assets;
    /// @notice Whether an address is a supported basket asset.
    mapping(address => bool) public isAsset;
    /// @notice Internal accounting of how much of each asset the vault holds.
    /// @dev Deliberately not `balanceOf(this)` — this is the donation-attack defense.
    mapping(address => uint256) public vaultBalance;

    event AssetAdded(address indexed asset);
    event RateReaderSet(address indexed reader);
    event Deposited(
        address indexed caller, address indexed receiver, address indexed asset, uint256 amountIn, uint256 sharesOut
    );
    event Redeemed(address indexed caller, address indexed receiver, uint256 sharesIn);

    error NotAsset(address asset);
    error ZeroShares();
    error ZeroAmount();
    error AlreadyAsset(address asset);
    error BadRate(address asset);

    constructor(string memory name_, string memory symbol_, IRateReader reader_, address owner_)
        ERC20(name_, symbol_)
        Ownable(owner_)
    {
        rateReader = reader_;
        emit RateReaderSet(address(reader_));
    }

    // ----------------------------------------------------------------- views

    function assetsLength() external view returns (uint256) {
        return assets.length;
    }

    function getAssets() external view returns (address[] memory) {
        return assets;
    }

    /// @notice Total value of the basket in MON (1e18).
    function nav() public view returns (uint256 total) {
        address[] memory a = assets;
        for (uint256 i; i < a.length; ++i) {
            uint256 bal = vaultBalance[a[i]];
            if (bal != 0) {
                total += bal.mulDiv(rateReader.rateOf(a[i]), ONE, Math.Rounding.Floor);
            }
        }
    }

    /// @notice MON value of one iMON share (1e18). Returns 1e18 before any deposit.
    function navPerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return ONE;
        return nav().mulDiv(ONE, supply, Math.Rounding.Floor);
    }

    /// @notice iMON that would be minted for depositing `amountIn` of `asset`.
    function previewDeposit(address asset, uint256 amountIn) public view returns (uint256) {
        uint256 valueIn = amountIn.mulDiv(rateReader.rateOf(asset), ONE, Math.Rounding.Floor);
        return valueIn.mulDiv(totalSupply() + VIRT_SHARES, nav() + 1, Math.Rounding.Floor);
    }

    /// @notice The per-asset amounts `shares` iMON would redeem for right now.
    function previewRedeem(uint256 shares)
        public
        view
        returns (address[] memory outAssets, uint256[] memory amounts)
    {
        uint256 supply = totalSupply();
        outAssets = assets;
        amounts = new uint256[](outAssets.length);
        if (supply == 0) return (outAssets, amounts);
        for (uint256 i; i < outAssets.length; ++i) {
            amounts[i] = vaultBalance[outAssets[i]].mulDiv(shares, supply, Math.Rounding.Floor);
        }
    }

    // ------------------------------------------------------------- mutative

    /// @notice Deposit `amountIn` of a supported `asset`, minting iMON to `receiver`.
    function deposit(address asset, uint256 amountIn, address receiver)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (!isAsset[asset]) revert NotAsset(asset);
        if (amountIn == 0) revert ZeroAmount();

        // Price against pre-deposit NAV and supply so the depositor isn't credited for
        // their own deposit.
        uint256 navBefore = nav();
        uint256 supplyBefore = totalSupply();
        uint256 valueIn = amountIn.mulDiv(rateReader.rateOf(asset), ONE, Math.Rounding.Floor);
        shares = valueIn.mulDiv(supplyBefore + VIRT_SHARES, navBefore + 1, Math.Rounding.Floor);
        if (shares == 0) revert ZeroShares();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amountIn);
        vaultBalance[asset] += amountIn;

        if (supplyBefore == 0) {
            _mint(DEAD, DEAD_SHARES); // permanent floor; never redeemable
        }
        _mint(receiver, shares);

        emit Deposited(msg.sender, receiver, asset, amountIn, shares);
    }

    /// @notice Burn `shares` iMON and return a pro-rata slice of every basket asset.
    /// @dev Intentionally never reads the oracle, never checks caps, and (in later
    ///      phases) is never pausable — the exit must always work.
    function redeem(uint256 shares, address receiver)
        external
        nonReentrant
        returns (address[] memory outAssets, uint256[] memory amounts)
    {
        if (shares == 0) revert ZeroShares();
        uint256 supply = totalSupply(); // pre-burn supply for the pro-rata

        _burn(msg.sender, shares); // reverts if caller lacks the shares

        outAssets = assets;
        amounts = new uint256[](outAssets.length);
        // Effects first: debit internal balances before any transfer out.
        for (uint256 i; i < outAssets.length; ++i) {
            uint256 amt = vaultBalance[outAssets[i]].mulDiv(shares, supply, Math.Rounding.Floor);
            if (amt != 0) {
                vaultBalance[outAssets[i]] -= amt;
                amounts[i] = amt;
            }
        }
        // Interactions last.
        for (uint256 i; i < outAssets.length; ++i) {
            if (amounts[i] != 0) {
                IERC20(outAssets[i]).safeTransfer(receiver, amounts[i]);
            }
        }

        emit Redeemed(msg.sender, receiver, shares);
    }

    // ---------------------------------------------------------------- admin
    // Minimal owner control for Phase 1. Phase 3 replaces this with AccessControl
    // roles (GUARDIAN/GOVERNOR/KEEPER) + a timelock, and adds per-asset caps + pause.

    function addAsset(address asset) external onlyOwner {
        if (isAsset[asset]) revert AlreadyAsset(asset);
        if (rateReader.rateOf(asset) == 0) revert BadRate(asset);
        isAsset[asset] = true;
        assets.push(asset);
        emit AssetAdded(asset);
    }

    function setRateReader(IRateReader reader_) external onlyOwner {
        rateReader = reader_;
        emit RateReaderSet(address(reader_));
    }
}
