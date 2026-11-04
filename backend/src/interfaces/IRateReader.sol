// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRateReader
/// @notice Returns the MON value of a liquid staking token, normalized to 1e18.
/// @dev In Phase 2 the production RateReader reads each LST's canonical on-chain
///      exchange-rate getter and adds staleness / deviation / monotonic guards.
///      The vault only ever calls this on the deposit path, never on redeem.
interface IRateReader {
    /// @notice MON value of 1e18 units of `asset`, in 1e18 precision.
    /// @dev Must return 0 for an unknown/unreadable asset (the vault treats 0 as invalid).
    function rateOf(address asset) external view returns (uint256);
}
