// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRateAdapter
/// @notice Per-LST adapter that normalizes a canonical on-chain rate to MON-per-1e18-token.
/// @dev Adapters are view-only. RateReader owns staleness / deviation / monotonic guards.
interface IRateAdapter {
    /// @notice MON value of 1e18 units of the underlying LST, in 1e18 precision.
    /// @return rate MON per 1e18 token (0 = unreadable / invalid).
    /// @return updatedAt Observation time. Live ERC-4626 getters use `block.timestamp`;
    ///         oracle-backed adapters must surface the feed's `updatedAt`.
    function readRate() external view returns (uint256 rate, uint256 updatedAt);

    /// @notice The LST token this adapter prices.
    function asset() external view returns (address);
}
