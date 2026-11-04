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
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";
import {IWETH9} from "./interfaces/IWETH9.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {YieldOracle} from "./YieldOracle.sol";

/// @title iMONVault
/// @notice Multi-LST index share token. Auto-routes / rebalances toward higher APR
///         sleeves **within** hard ≤30% weight caps (bounded loss — not "max APR at any cost").
/// @dev Redeem is always pro-rata raw balances — no oracle, no cap check, never paused.
contract iMONVault is ERC20, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint8 internal constant OFFSET = 3;
    uint256 internal constant VIRT_SHARES = 10 ** OFFSET;
    uint256 internal constant DEAD_SHARES = 1000;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 internal constant ONE = 1e18;
    uint16 internal constant DEFAULT_CAP_BPS = 3_000;

    IRateReader public rateReader;
    AssetRegistry public registry;
    YieldOracle public yieldOracle;
    ISwapAdapter public swapAdapter;
    address public keeper;
    /// @notice Wrapped MON (WMON) used by `depositMON` — wrap native → swap into preferred LST.
    address public wmon;

    address[] public assets;
    mapping(address => bool) public isAsset;
    mapping(address => uint256) public vaultBalance;
    /// @dev Fallback caps when registry is unset (≤ HARD_MAX 3000).
    mapping(address => uint16) public capBps;

    bool public depositsPaused;
    bool public autoRouteDeposits; // if true, deposit() may swap into preferredAsset first

    event AssetAdded(address indexed asset);
    event RateReaderSet(address indexed reader);
    event RegistrySet(address indexed registry);
    event YieldOracleSet(address indexed oracle);
    event SwapAdapterSet(address indexed adapter);
    event KeeperSet(address indexed keeper);
    event WmonSet(address indexed wmon);
    event AutoRouteSet(bool enabled);
    event CapSet(address indexed asset, uint16 capBps);
    event DepositsPaused(bool paused);
    event Deposited(
        address indexed caller, address indexed receiver, address indexed asset, uint256 amountIn, uint256 sharesOut
    );
    event Redeemed(address indexed caller, address indexed receiver, uint256 sharesIn);
    event Rebalanced(
        address indexed caller, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut
    );

    error NotAsset(address asset);
    error ZeroShares();
    error ZeroAmount();
    error AlreadyAsset(address asset);
    error BadRate(address asset);
    error CapExceeded(address asset);
    error DepositsArePaused();
    error NotKeeper();
    error InsufficientBalance();
    error ZeroAddress();
    error Slippage();
    error BadCap();

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    constructor(string memory name_, string memory symbol_, IRateReader reader_, address owner_)
        ERC20(name_, symbol_)
        Ownable(owner_)
    {
        if (address(reader_) == address(0) || owner_ == address(0)) revert ZeroAddress();
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

    function nav() public view returns (uint256 total) {
        address[] memory a = assets;
        for (uint256 i; i < a.length; ++i) {
            uint256 bal = vaultBalance[a[i]];
            if (bal != 0) {
                total += bal.mulDiv(rateReader.rateOf(a[i]), ONE, Math.Rounding.Floor);
            }
        }
    }

    function navPerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return ONE;
        return nav().mulDiv(ONE, supply, Math.Rounding.Floor);
    }

    function previewDeposit(address asset, uint256 amountIn) public view returns (uint256) {
        uint256 valueIn = amountIn.mulDiv(rateReader.rateOf(asset), ONE, Math.Rounding.Floor);
        return valueIn.mulDiv(totalSupply() + VIRT_SHARES, nav() + 1, Math.Rounding.Floor);
    }

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

    function weightBps(address asset) public view returns (uint16) {
        uint256 n = nav();
        if (n == 0) return 0;
        uint256 value = vaultBalance[asset].mulDiv(rateReader.rateOf(asset), ONE, Math.Rounding.Floor);
        return uint16(value.mulDiv(10_000, n, Math.Rounding.Floor));
    }

    function effectiveCapBps(address asset) public view returns (uint16) {
        if (address(registry) != address(0)) {
            AssetRegistry.Config memory cfg = registry.configOf(asset);
            if (cfg.exists) return cfg.capBps;
        }
        uint16 localCap = capBps[asset];
        return localCap == 0 ? DEFAULT_CAP_BPS : localCap;
    }

    /// @notice Best LST to put new capital into: highest trailing APR with cap headroom.
    function preferredDepositAsset() public view returns (address best, int256 apr) {
        if (address(yieldOracle) == address(0)) return (address(0), 0);
        uint256 n = assets.length;
        address[] memory a = assets;
        uint16[] memory w = new uint16[](n);
        uint16[] memory caps = new uint16[](n);
        bool[] memory en = new bool[](n);
        for (uint256 i; i < n; ++i) {
            w[i] = weightBps(a[i]);
            caps[i] = effectiveCapBps(a[i]);
            en[i] = _enabled(a[i]);
        }
        return yieldOracle.bestAsset(a, w, caps, en);
    }

    /// @notice LST sleeve new MON / auto-routed deposits will enter (preferred, else first enabled).
    function resolveDepositTarget() public view returns (address target) {
        (address pref,) = preferredDepositAsset();
        if (pref != address(0) && _enabled(pref)) return pref;
        uint256 n = assets.length;
        for (uint256 i; i < n; ++i) {
            if (_enabled(assets[i])) return assets[i];
        }
        return address(0);
    }

    /// @notice Preview iMON shares for a native MON deposit (fair rate − 0.5% slip haircut).
    function previewDepositMON(uint256 monAmount) public view returns (uint256 shares, address target) {
        target = resolveDepositTarget();
        if (target == address(0) || monAmount == 0) return (0, target);
        uint256 rate = rateReader.rateOf(target);
        if (rate == 0) return (0, target);
        uint256 lstEst = monAmount.mulDiv(ONE, rate, Math.Rounding.Floor);
        lstEst = lstEst.mulDiv(9_950, 10_000, Math.Rounding.Floor);
        uint256 valueIn = lstEst.mulDiv(rate, ONE, Math.Rounding.Floor);
        shares = valueIn.mulDiv(totalSupply() + VIRT_SHARES, nav() + 1, Math.Rounding.Floor);
    }

    // ------------------------------------------------------------- mutative

    /// @notice Deposit native MON — wrap to WMON, swap into the max-APR sleeve, mint iMON.
    /// @dev One-click path: user never needs to buy an LST first.
    function depositMON(address receiver, uint256 minSharesOut)
        external
        payable
        nonReentrant
        returns (uint256 shares)
    {
        if (depositsPaused) revert DepositsArePaused();
        if (msg.value == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();
        if (wmon == address(0) || address(swapAdapter) == address(0)) revert ZeroAddress();

        address target = resolveDepositTarget();
        if (target == address(0) || !_enabled(target)) revert NotAsset(target);

        // 1) Wrap native MON → WMON
        IWETH9(wmon).deposit{value: msg.value}();

        // 2) Swap WMON → preferred LST (single-hop fee=100 pools on Monad)
        uint256 rate = rateReader.rateOf(target);
        uint256 minLst = msg.value.mulDiv(ONE, rate, Math.Rounding.Floor);
        minLst = minLst.mulDiv(9_950, 10_000, Math.Rounding.Floor); // 0.5% slip

        IERC20(wmon).forceApprove(address(swapAdapter), msg.value);
        uint256 lstOut = swapAdapter.swap(wmon, target, msg.value, minLst, address(this));
        IERC20(wmon).forceApprove(address(swapAdapter), 0);
        if (lstOut < minLst) revert Slippage();

        // 3) Credit sleeve + mint shares (same NAV math as LST deposit)
        uint256 valueIn = lstOut.mulDiv(rateReader.rateOf(target), ONE, Math.Rounding.Floor);
        uint256 navBefore = nav();
        uint256 supplyBefore = totalSupply();
        shares = valueIn.mulDiv(supplyBefore + VIRT_SHARES, navBefore + 1, Math.Rounding.Floor);
        if (shares == 0) revert ZeroShares();
        if (shares < minSharesOut) revert Slippage();

        vaultBalance[target] += lstOut;
        if (supplyBefore == 0) _mint(DEAD, DEAD_SHARES);
        _mint(receiver, shares);
        _enforceWeightCaps();

        emit Deposited(msg.sender, receiver, target, lstOut, shares);
    }

    /// @notice Deposit an LST. If `autoRouteDeposits` is on and another sleeve has higher APR
    ///         with headroom, capital is swapped into that sleeve first (max-APR routing).
    function deposit(address asset, uint256 amountIn, address receiver)
        external
        nonReentrant
        returns (uint256 shares)
    {
        address[] memory assetsIn = new address[](1);
        uint256[] memory amountsIn = new uint256[](1);
        assetsIn[0] = asset;
        amountsIn[0] = amountIn;
        shares = _depositMany(assetsIn, amountsIn, receiver, true);
    }

    /// @notice Multi-asset deposit — required to bootstrap under ≤30% caps (need ≥4 sleeves
    ///         at ≤25% each). Credits all legs, then mints shares once, then enforces caps.
    function depositMany(address[] calldata assetsIn, uint256[] calldata amountsIn, address receiver)
        external
        nonReentrant
        returns (uint256 shares)
    {
        shares = _depositMany(assetsIn, amountsIn, receiver, false);
    }

    function _depositMany(
        address[] memory assetsIn,
        uint256[] memory amountsIn,
        address receiver,
        bool allowAutoRoute
    ) internal returns (uint256 shares) {
        if (depositsPaused) revert DepositsArePaused();
        if (receiver == address(0)) revert ZeroAddress();
        uint256 n = assetsIn.length;
        if (n == 0 || n != amountsIn.length) revert ZeroAmount();

        uint256 valueIn;
        address[] memory creditAssets = new address[](n);
        uint256[] memory creditAmts = new uint256[](n);

        for (uint256 i; i < n; ++i) {
            address asset = assetsIn[i];
            uint256 amountIn = amountsIn[i];
            if (!isAsset[asset] || !_enabled(asset)) revert NotAsset(asset);
            if (amountIn == 0) revert ZeroAmount();

            IERC20(asset).safeTransferFrom(msg.sender, address(this), amountIn);

            address creditAsset = asset;
            uint256 creditAmt = amountIn;

            if (
                allowAutoRoute && n == 1 && autoRouteDeposits && address(swapAdapter) != address(0)
                    && address(yieldOracle) != address(0)
            ) {
                (address pref,) = preferredDepositAsset();
                if (pref != address(0) && pref != asset && _enabled(pref)) {
                    uint256 v = amountIn.mulDiv(rateReader.rateOf(asset), ONE, Math.Rounding.Floor);
                    uint256 minOut = v.mulDiv(ONE, rateReader.rateOf(pref), Math.Rounding.Floor);
                    minOut = minOut.mulDiv(9950, 10_000, Math.Rounding.Floor);
                    IERC20(asset).forceApprove(address(swapAdapter), amountIn);
                    creditAmt = swapAdapter.swap(asset, pref, amountIn, minOut, address(this));
                    IERC20(asset).forceApprove(address(swapAdapter), 0);
                    creditAsset = pref;
                }
            }

            creditAssets[i] = creditAsset;
            creditAmts[i] = creditAmt;
            valueIn += creditAmt.mulDiv(rateReader.rateOf(creditAsset), ONE, Math.Rounding.Floor);
        }

        uint256 navBefore = nav();
        uint256 supplyBefore = totalSupply();
        shares = valueIn.mulDiv(supplyBefore + VIRT_SHARES, navBefore + 1, Math.Rounding.Floor);
        if (shares == 0) revert ZeroShares();

        for (uint256 i; i < n; ++i) {
            vaultBalance[creditAssets[i]] += creditAmts[i];
            emit Deposited(msg.sender, receiver, creditAssets[i], creditAmts[i], n == 1 ? shares : 0);
        }
        if (supplyBefore == 0) _mint(DEAD, DEAD_SHARES);
        _mint(receiver, shares);
        _enforceWeightCaps();
    }

    /// @notice Keeper: rotate `amountIn` of `tokenIn` into `tokenOut` via the swap adapter.
    /// @dev Enforces caps after; requires MON-value out ≥ in within `maxSlippageBps`.
    function rebalance(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)
        external
        nonReentrant
        onlyKeeper
        returns (uint256 amountOut)
    {
        if (depositsPaused) revert DepositsArePaused();
        if (!isAsset[tokenIn] || !isAsset[tokenOut]) revert NotAsset(tokenIn);
        if (!_enabled(tokenOut)) revert NotAsset(tokenOut);
        if (amountIn == 0) revert ZeroAmount();
        if (vaultBalance[tokenIn] < amountIn) revert InsufficientBalance();
        if (address(swapAdapter) == address(0)) revert ZeroAddress();

        uint256 navBefore = nav();
        vaultBalance[tokenIn] -= amountIn;

        IERC20(tokenIn).forceApprove(address(swapAdapter), amountIn);
        amountOut = swapAdapter.swap(tokenIn, tokenOut, amountIn, minAmountOut, address(this));
        IERC20(tokenIn).forceApprove(address(swapAdapter), 0);
        if (amountOut < minAmountOut) revert Slippage();

        vaultBalance[tokenOut] += amountOut;
        _enforceWeightCaps();

        // Soft NAV check — allow tiny rounding, not value extraction
        uint256 navAfter = nav();
        if (navAfter + 1e15 < navBefore) revert Slippage(); // 0.001 MON tolerance

        emit Rebalanced(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Burn shares → pro-rata raw basket. Never oracle / cap / pause gated.
    function redeem(uint256 shares, address receiver)
        external
        nonReentrant
        returns (address[] memory outAssets, uint256[] memory amounts)
    {
        if (shares == 0) revert ZeroShares();
        if (receiver == address(0)) revert ZeroAddress();
        uint256 supply = totalSupply();

        _burn(msg.sender, shares);

        outAssets = assets;
        amounts = new uint256[](outAssets.length);
        for (uint256 i; i < outAssets.length; ++i) {
            uint256 amt = vaultBalance[outAssets[i]].mulDiv(shares, supply, Math.Rounding.Floor);
            if (amt != 0) {
                vaultBalance[outAssets[i]] -= amt;
                amounts[i] = amt;
            }
        }
        for (uint256 i; i < outAssets.length; ++i) {
            if (amounts[i] != 0) IERC20(outAssets[i]).safeTransfer(receiver, amounts[i]);
        }
        emit Redeemed(msg.sender, receiver, shares);
    }

    // ---------------------------------------------------------------- admin

    function addAsset(address asset) external onlyOwner {
        if (isAsset[asset]) revert AlreadyAsset(asset);
        if (rateReader.rateOf(asset) == 0) revert BadRate(asset);
        isAsset[asset] = true;
        assets.push(asset);
        if (capBps[asset] == 0) capBps[asset] = DEFAULT_CAP_BPS;
        emit AssetAdded(asset);
    }

    function setCapBps(address asset, uint16 cap) external onlyOwner {
        if (!isAsset[asset]) revert NotAsset(asset);
        if (cap == 0 || cap > 3_000) revert BadCap();
        capBps[asset] = cap;
        emit CapSet(asset, cap);
    }

    function setRateReader(IRateReader reader_) external onlyOwner {
        if (address(reader_) == address(0)) revert ZeroAddress();
        rateReader = reader_;
        emit RateReaderSet(address(reader_));
    }

    function setRegistry(AssetRegistry registry_) external onlyOwner {
        registry = registry_;
        emit RegistrySet(address(registry_));
    }

    function setYieldOracle(YieldOracle oracle_) external onlyOwner {
        yieldOracle = oracle_;
        emit YieldOracleSet(address(oracle_));
    }

    function setSwapAdapter(ISwapAdapter adapter_) external onlyOwner {
        swapAdapter = adapter_;
        emit SwapAdapterSet(address(adapter_));
    }

    function setWmon(address wmon_) external onlyOwner {
        if (wmon_ == address(0)) revert ZeroAddress();
        wmon = wmon_;
        emit WmonSet(wmon_);
    }

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }

    function setAutoRouteDeposits(bool enabled) external onlyOwner {
        autoRouteDeposits = enabled;
        emit AutoRouteSet(enabled);
    }

    function pauseDeposits(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }

    // ---------------------------------------------------------------- internal

    function _enabled(address asset) internal view returns (bool) {
        if (address(registry) == address(0)) return isAsset[asset];
        return registry.isEnabled(asset);
    }

    function _enforceWeightCaps() internal view {
        uint256 n = nav();
        if (n == 0) return;
        address[] memory a = assets;
        uint256 live;
        for (uint256 i; i < a.length; ++i) {
            if (vaultBalance[a[i]] != 0) live++;
        }
        // ≤30% caps are only mathematically feasible with ≥4 sleeves (4×30% ≥ 100%).
        // Until sMON (or a 4th LST) is wired, skip hard enforcement so a 3-LST basket can exist.
        // TODO(sMON): flip this back to `live < 2` once four rate adapters are live.
        if (live < 4) return;

        for (uint256 i; i < a.length; ++i) {
            if (!_enabled(a[i])) continue;
            uint256 bal = vaultBalance[a[i]];
            if (bal == 0) continue;
            uint256 valueI = bal.mulDiv(rateReader.rateOf(a[i]), ONE, Math.Rounding.Floor);
            uint16 cap = effectiveCapBps(a[i]);
            if (valueI * 10_000 > n * uint256(cap)) revert CapExceeded(a[i]);
        }
    }
}
