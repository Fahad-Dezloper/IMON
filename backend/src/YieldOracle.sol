// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IRateReader} from "./interfaces/IRateReader.sol";

/// @title YieldOracle
/// @notice Live + trailing APR for auto-routing capital to higher-yield LSTs.
/// @dev Prefer keeper-pushed live APY (DefiLlama / protocol feeds) when fresh;
///      fall back to trailing rate-growth APR from RateReader snapshots.
///      Not a promise of future yield. Rebalance still respects caps in the vault.
contract YieldOracle is Ownable2Step {
    using Math for uint256;

    uint256 internal constant YEAR = 365 days;
    /// @notice Live APY is trusted for this long after a keeper push.
    uint64 public constant LIVE_MAX_AGE = 1 days;

    IRateReader public rateReader;
    address public pusher; // keeper that may pushLiveApr

    struct Snapshot {
        uint256 rate;
        uint64 timestamp;
    }

    mapping(address => Snapshot) public last;
    mapping(address => Snapshot) public prev;
    /// @notice Trailing APR from rate snapshots (bps).
    mapping(address => int256) public aprBps;
    mapping(address => bool) public hasApr;
    /// @notice Live APY pushed by keeper (bps, e.g. 1369 = 13.69%).
    mapping(address => int256) public liveAprBps;
    mapping(address => uint64) public liveUpdatedAt;

    event ReaderSet(address indexed reader);
    event PusherSet(address indexed pusher);
    event Recorded(address indexed asset, uint256 rate, int256 aprBps);
    event LiveAprPushed(address indexed asset, int256 aprBps, address indexed by);

    error ZeroAddress();
    error NoReader();
    error BadRate();
    error NotPusher();

    constructor(address owner_, IRateReader reader_) Ownable(owner_) {
        if (address(reader_) == address(0)) revert ZeroAddress();
        rateReader = reader_;
        emit ReaderSet(address(reader_));
    }

    function setRateReader(IRateReader reader_) external onlyOwner {
        if (address(reader_) == address(0)) revert ZeroAddress();
        rateReader = reader_;
        emit ReaderSet(address(reader_));
    }

    function setPusher(address pusher_) external onlyOwner {
        pusher = pusher_;
        emit PusherSet(pusher_);
    }

    modifier onlyPusher() {
        if (msg.sender != pusher && msg.sender != owner()) revert NotPusher();
        _;
    }

    /// @notice Effective APR used for routing: live if fresh, else trailing.
    function effectiveAprBps(address asset) public view returns (int256) {
        uint64 t = liveUpdatedAt[asset];
        if (t != 0 && block.timestamp >= t && block.timestamp - t <= LIVE_MAX_AGE) {
            return liveAprBps[asset];
        }
        return aprBps[asset];
    }

    /// @notice Keeper: push live protocol APY (1 bps = 0.01%). Marks hasApr.
    function pushLiveApr(address asset, int256 apr) external onlyPusher {
        liveAprBps[asset] = apr;
        liveUpdatedAt[asset] = uint64(block.timestamp);
        hasApr[asset] = true;
        emit LiveAprPushed(asset, apr, msg.sender);
    }

    function pushLiveAprMany(address[] calldata assets_, int256[] calldata aprs_) external onlyPusher {
        uint256 n = assets_.length;
        require(n == aprs_.length, "len");
        for (uint256 i; i < n; ++i) {
            address asset = assets_[i];
            liveAprBps[asset] = aprs_[i];
            liveUpdatedAt[asset] = uint64(block.timestamp);
            hasApr[asset] = true;
            emit LiveAprPushed(asset, aprs_[i], msg.sender);
        }
    }

    /// @notice Permissionless: pull live rate, update trailing APR window.
    function record(address asset) external returns (int256 apr) {
        return _record(asset);
    }

    function recordMany(address[] calldata assets_) external {
        for (uint256 i; i < assets_.length; ++i) {
            _record(assets_[i]);
        }
    }

    function _record(address asset) internal returns (int256 apr) {
        if (address(rateReader) == address(0)) revert NoReader();
        uint256 rate = rateReader.rateOf(asset);
        if (rate == 0) revert BadRate();

        Snapshot memory cur = last[asset];
        if (cur.timestamp != 0 && cur.rate != 0 && block.timestamp > cur.timestamp) {
            prev[asset] = cur;
            uint256 dt = block.timestamp - cur.timestamp;
            if (rate >= cur.rate) {
                uint256 growthBps = (rate - cur.rate).mulDiv(10_000, cur.rate, Math.Rounding.Floor);
                apr = int256(growthBps.mulDiv(YEAR, dt, Math.Rounding.Floor));
            } else {
                uint256 dropBps = (cur.rate - rate).mulDiv(10_000, cur.rate, Math.Rounding.Floor);
                apr = -int256(dropBps.mulDiv(YEAR, dt, Math.Rounding.Floor));
            }
            aprBps[asset] = apr;
            hasApr[asset] = true;
        } else {
            apr = aprBps[asset];
        }

        last[asset] = Snapshot({rate: rate, timestamp: uint64(block.timestamp)});
        emit Recorded(asset, rate, aprBps[asset]);
    }

    /// @notice Highest effective-APR enabled asset with cap headroom.
    function bestAsset(
        address[] calldata assets,
        uint16[] calldata weightsBps,
        uint16[] calldata capBps,
        bool[] calldata enabled
    ) external view returns (address best, int256 bestApr) {
        uint256 n = assets.length;
        require(n == weightsBps.length && n == capBps.length && n == enabled.length, "len");
        bestApr = type(int256).min;
        for (uint256 i; i < n; ++i) {
            if (!enabled[i]) continue;
            if (weightsBps[i] >= capBps[i]) continue;
            if (!_hasEffectiveApr(assets[i])) continue;
            int256 a = effectiveAprBps(assets[i]);
            if (best == address(0) || a > bestApr) {
                best = assets[i];
                bestApr = a;
            }
        }
    }

    /// @notice Lowest effective-APR overweight sleeve — rotation source.
    function worstAsset(
        address[] calldata assets,
        uint16[] calldata weightsBps,
        bool[] calldata enabled,
        uint16 minWeightBps
    ) external view returns (address worst, int256 worstApr) {
        uint256 n = assets.length;
        require(n == weightsBps.length && n == enabled.length, "len");
        worstApr = type(int256).max;
        for (uint256 i; i < n; ++i) {
            if (!enabled[i]) continue;
            if (weightsBps[i] < minWeightBps) continue;
            if (!_hasEffectiveApr(assets[i])) continue;
            int256 a = effectiveAprBps(assets[i]);
            if (worst == address(0) || a < worstApr) {
                worst = assets[i];
                worstApr = a;
            }
        }
    }

    function _hasEffectiveApr(address asset) internal view returns (bool) {
        uint64 t = liveUpdatedAt[asset];
        if (t != 0 && block.timestamp >= t && block.timestamp - t <= LIVE_MAX_AGE) return true;
        return hasApr[asset];
    }
}
