// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ScaffoldCheck
/// @notice Phase 0 placeholder that proves the Foundry toolchain compiles and tests.
///         It holds no funds and has no role in the protocol. The real contracts
///         (iMONVault, AssetRegistry, RateReader, FeeController, Guardian) land in Phase 1.
contract ScaffoldCheck {
    string public constant NAME = "iMON";
    uint256 public constant PHASE = 0;

    /// @notice Trivial pure function so the test suite has something to assert.
    function ping() external pure returns (bool) {
        return true;
    }
}
