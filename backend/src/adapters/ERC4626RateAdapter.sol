// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IRateAdapter} from "../interfaces/IRateAdapter.sol";

/// @title ERC4626RateAdapter
/// @notice Prices an ERC-4626 LST via `convertToAssets(1e18)`.
/// @dev Suitable for aprMON / gMON (and any vanilla 4626 LST). For shMON use
///      `ShMONRateAdapter` — FastLane's convertToAssets already deducts recent-epoch
///      revenue, but we keep a dedicated adapter to document the quirk and pin the getter.
contract ERC4626RateAdapter is IRateAdapter {
    IERC4626 public immutable TOKEN;

    constructor(address token_) {
        require(token_ != address(0), "zero token");
        TOKEN = IERC4626(token_);
    }

    function asset() external view returns (address) {
        return address(TOKEN);
    }

    function readRate() external view returns (uint256 rate, uint256 updatedAt) {
        rate = TOKEN.convertToAssets(1e18);
        updatedAt = block.timestamp; // live on-chain getter — always "fresh"
    }
}
