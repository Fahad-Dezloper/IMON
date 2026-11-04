// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapAdapter} from "../interfaces/ISwapAdapter.sol";

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

/// @title UniswapV3SwapAdapter
/// @notice Vault-facing swap port over Uniswap V3 SwapRouter02 on Monad.
/// @dev LST↔LST routes via WMON multi-hop. Prefer the deepest fee tier that has a pool
///      (Monad LST/WMON liquidity is concentrated at 0.01% / fee=100).
contract UniswapV3SwapAdapter is ISwapAdapter {
    using SafeERC20 for IERC20;

    address public constant MAINNET_SWAP_ROUTER_02 = 0xfE31F71C1b106EAc32F1A19239c9a9A72ddfb900;
    address public constant MAINNET_V3_FACTORY = 0x204FAca1764B154221e35c0d20aBb3c525710498;
    address public constant MAINNET_WMON = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;

    ISwapRouter02 public immutable ROUTER;
    IUniswapV3Factory public immutable FACTORY;
    address public immutable WMON;
    uint24 public immutable DEFAULT_FEE; // fallback when no pool lookup (legacy)
    address public vault;

    error OnlyVault();
    error ZeroAddress();
    error NoPool(address tokenA, address tokenB);

    constructor(address router_, address factory_, address wmon_, uint24 defaultFee_, address vault_) {
        if (router_ == address(0) || factory_ == address(0) || wmon_ == address(0) || vault_ == address(0)) {
            revert ZeroAddress();
        }
        ROUTER = ISwapRouter02(router_);
        FACTORY = IUniswapV3Factory(factory_);
        WMON = wmon_;
        DEFAULT_FEE = defaultFee_;
        vault = vault_;
    }

    function setVault(address vault_) external {
        require(msg.sender == vault, "not vault");
        if (vault_ == address(0)) revert ZeroAddress();
        vault = vault_;
    }

    /// @notice Resolve best fee tier that has a live Uniswap V3 pool.
    function bestFee(address tokenA, address tokenB) public view returns (uint24 fee) {
        uint24 f = _safeFee(tokenA, tokenB);
        if (FACTORY.getPool(tokenA, tokenB, f) == address(0)) revert NoPool(tokenA, tokenB);
        return f;
    }

    /// @inheritdoc ISwapAdapter
    /// @dev Single-hop when either leg is WMON; otherwise LST→WMON→LST multi-hop.
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address recipient)
        external
        returns (uint256 amountOut)
    {
        if (msg.sender != vault) revert OnlyVault();
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(ROUTER), amountIn);

        if (tokenIn == WMON || tokenOut == WMON) {
            uint24 fee = _safeFee(tokenIn, tokenOut);
            amountOut = ROUTER.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: recipient,
                    amountIn: amountIn,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            uint24 feeIn = _safeFee(tokenIn, WMON);
            uint24 feeOut = _safeFee(WMON, tokenOut);
            bytes memory path = abi.encodePacked(tokenIn, feeIn, WMON, feeOut, tokenOut);
            amountOut = ROUTER.exactInput(
                ISwapRouter02.ExactInputParams({
                    path: path, recipient: recipient, amountIn: amountIn, amountOutMinimum: minOut
                })
            );
        }

        IERC20(tokenIn).forceApprove(address(ROUTER), 0);
    }

    /// @notice Explicit multi-hop path (advanced / keeper overrides).
    function swapPath(bytes calldata path, uint256 amountIn, uint256 minOut, address recipient)
        external
        returns (uint256 amountOut)
    {
        if (msg.sender != vault) revert OnlyVault();
        address tokenIn;
        assembly {
            tokenIn := shr(96, calldataload(path.offset))
        }
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(ROUTER), amountIn);
        amountOut = ROUTER.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path, recipient: recipient, amountIn: amountIn, amountOutMinimum: minOut
            })
        );
        IERC20(tokenIn).forceApprove(address(ROUTER), 0);
    }

    function _safeFee(address a, address b) internal view returns (uint24) {
        // Prefer tightest fee first — Monad LST/WMON liquidity is at 0.01% (fee=100).
        if (FACTORY.getPool(a, b, 100) != address(0)) return 100;
        if (FACTORY.getPool(a, b, 500) != address(0)) return 500;
        if (FACTORY.getPool(a, b, 3000) != address(0)) return 3000;
        if (FACTORY.getPool(a, b, 10_000) != address(0)) return 10_000;
        return DEFAULT_FEE;
    }
}
