// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal WETH9 / WMON wrap interface.
interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}
