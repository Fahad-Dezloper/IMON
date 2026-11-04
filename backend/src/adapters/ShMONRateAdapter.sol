// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRateAdapter} from "../interfaces/IRateAdapter.sol";

/// @dev Minimal shMON surface. FastLane ShMonad is ERC-4626-like with a dual rate:
///      - convertToAssets / convertToShares deduct recent-epoch revenue (unstake equity)
///      - deposit path (previewDeposit) does not — so deposit quotes are richer
///      - previewRedeem further haircuts by the atomic-unstake fee
///      - crank() advances epoch accounting near boundaries
///
///      Per BUILD.md we price NAV on the **conservative unstake equity** rate so the vault
///      never over-values the sleeve. That is `convertToAssets(1e18)` (already deducts
///      recent revenue). We deliberately do NOT use `previewRedeem` — that embeds an
///      exit fee the vault does not pay while merely holding shMON.
interface IShMON {
    function convertToAssets(uint256 shares) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function crank() external returns (bool);
}

/// @title ShMONRateAdapter
/// @notice Prices FastLane shMON for iMON NAV using convertToAssets(1e18).
contract ShMONRateAdapter is IRateAdapter {
    /// @notice Confirmed Monad mainnet shMON (FastLane). Re-verify on monadscan before deploy.
    address public constant MAINNET_SHMON = 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c;

    IShMON public immutable TOKEN;

    constructor(address token_) {
        require(token_ != address(0), "zero token");
        TOKEN = IShMON(token_);
    }

    function asset() external view returns (address) {
        return address(TOKEN);
    }

    /// @inheritdoc IRateAdapter
    /// @dev Getter: `convertToAssets(1e18)` — conservative unstake equity (excludes
    ///      current-epoch rewards FastLane hasn't finalized). Not `previewRedeem`
    ///      (that also subtracts the atomic-unstake fee).
    function readRate() external view returns (uint256 rate, uint256 updatedAt) {
        rate = TOKEN.convertToAssets(1e18);
        updatedAt = block.timestamp;
    }

    /// @notice Unstake quote including the atomic fee — for off-chain comparison only.
    /// @dev Not used for NAV. Keeper / health monitor may compare this vs convertToAssets
    ///      to detect fee regime changes. May need `crank()` near epoch boundaries for
    ///      a correct exit quote (BUILD.md); this view does not call crank.
    function unstakeQuote(uint256 shares) external view returns (uint256) {
        return TOKEN.previewRedeem(shares);
    }
}
