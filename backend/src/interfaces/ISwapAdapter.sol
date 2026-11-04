// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal swap port used by the vault rebalancer (Uniswap V3 adapter in production).
interface ISwapAdapter {
    /// @dev Pulls `amountIn` of `tokenIn` from the caller (vault), sends `tokenOut` to `recipient`.
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address recipient)
        external
        returns (uint256 amountOut);
}
