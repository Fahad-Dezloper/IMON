// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IRateReader} from "./interfaces/IRateReader.sol";
import {IRateAdapter} from "./interfaces/IRateAdapter.sol";

/// @title RateReader
/// @notice Single oracle chokepoint: adapter lookup + staleness / deviation / monotonic guards.
/// @dev `rateOf` is view and is called by the vault on the **deposit path only** (and by
///      NAV views). `redeem` never calls this contract. Checkpoint updates happen in
///      permissionless `poke`, so a keeper (or anyone) refreshes the baseline the guards
///      compare against.
contract RateReader is IRateReader, Ownable2Step {
    using Math for uint256;

    struct GuardConfig {
        uint64 maxAge; // seconds; 0 = disable staleness check
        uint16 maxDeviationBps; // |Δ|/last within one poke interval; 0 = disable
        uint16 maxDropBps; // sharp downward move vs last → flag + revert; 0 = disable
    }

    struct AssetState {
        IRateAdapter adapter;
        GuardConfig guards;
        uint256 lastRate;
        uint64 lastPoke;
        bool flagged; // set on monotonic drop; blocks rateOf until governor clears
        bool exists;
    }

    mapping(address => AssetState) public assets;

    event AdapterSet(address indexed asset, address indexed adapter, GuardConfig guards);
    event AdapterRemoved(address indexed asset);
    event Poked(address indexed asset, uint256 rate, uint64 timestamp);
    event AssetFlagged(address indexed asset, uint256 lastRate, uint256 newRate);
    event AssetUnflagged(address indexed asset);
    event GuardsUpdated(address indexed asset, GuardConfig guards);

    error UnknownAsset(address asset);
    error ZeroAddress();
    error AssetMismatch();
    error StaleRate(address asset, uint256 updatedAt, uint256 maxAge);
    error DeviationExceeded(address asset, uint256 lastRate, uint256 newRate);
    error MonotonicDrop(address asset, uint256 lastRate, uint256 newRate);
    error AssetIsFlagged(address asset);
    error BadGuards();

    constructor(address owner_) Ownable(owner_) {}

    // ----------------------------------------------------------------- admin

    /// @notice Register or replace the adapter + guards for `asset`.
    function setAdapter(address asset, IRateAdapter adapter, GuardConfig calldata guards) external onlyOwner {
        if (asset == address(0) || address(adapter) == address(0)) revert ZeroAddress();
        if (adapter.asset() != asset) revert AssetMismatch();
        if (guards.maxDeviationBps > 10_000 || guards.maxDropBps > 10_000) revert BadGuards();

        AssetState storage s = assets[asset];
        s.adapter = adapter;
        s.guards = guards;
        s.exists = true;
        // Fresh adapter: clear checkpoint so the next poke bootstraps without a false deviation.
        s.lastRate = 0;
        s.lastPoke = 0;
        s.flagged = false;

        emit AdapterSet(asset, address(adapter), guards);
    }

    function removeAdapter(address asset) external onlyOwner {
        if (!assets[asset].exists) revert UnknownAsset(asset);
        delete assets[asset];
        emit AdapterRemoved(asset);
    }

    function setGuards(address asset, GuardConfig calldata guards) external onlyOwner {
        AssetState storage s = assets[asset];
        if (!s.exists) revert UnknownAsset(asset);
        if (guards.maxDeviationBps > 10_000 || guards.maxDropBps > 10_000) revert BadGuards();
        s.guards = guards;
        emit GuardsUpdated(asset, guards);
    }

    /// @notice Clear a monotonic-drop flag after governance review (Phase 3: timelock).
    function unflag(address asset) external onlyOwner {
        AssetState storage s = assets[asset];
        if (!s.exists) revert UnknownAsset(asset);
        s.flagged = false;
        emit AssetUnflagged(asset);
    }

    // ----------------------------------------------------------------- views

    /// @inheritdoc IRateReader
    /// @dev Applies staleness / deviation / monotonic / flagged guards. Returns 0 if the
    ///      asset has no adapter (vault treats 0 as invalid).
    function rateOf(address asset) external view returns (uint256) {
        AssetState storage s = assets[asset];
        if (!s.exists) return 0;
        if (s.flagged) revert AssetIsFlagged(asset);

        (uint256 rate, uint256 updatedAt) = s.adapter.readRate();
        if (rate == 0) return 0;

        _checkGuards(asset, s, rate, updatedAt);
        return rate;
    }

    /// @notice Unguarded live read — for keepers / dashboards. Does not revert on guards.
    function peek(address asset) external view returns (uint256 rate, uint256 updatedAt, bool flagged_) {
        AssetState storage s = assets[asset];
        if (!s.exists) return (0, 0, false);
        (rate, updatedAt) = s.adapter.readRate();
        flagged_ = s.flagged;
    }

    function isFlagged(address asset) external view returns (bool) {
        return assets[asset].flagged;
    }

    // ----------------------------------------------------------------- poke

    /// @notice Refresh the checkpoint used by deviation / monotonic guards.
    /// @dev Permissionless. On a sharp drop vs the previous checkpoint, flags the asset
    ///      (deposit path will revert via rateOf until `unflag`).
    function poke(address asset) external returns (uint256 rate) {
        AssetState storage s = assets[asset];
        if (!s.exists) revert UnknownAsset(asset);

        uint256 updatedAt;
        (rate, updatedAt) = s.adapter.readRate();
        if (rate == 0) return 0;

        // Staleness still applies to poke — don't checkpoint a dead feed.
        GuardConfig memory g = s.guards;
        if (g.maxAge != 0 && block.timestamp > updatedAt + g.maxAge) {
            revert StaleRate(asset, updatedAt, g.maxAge);
        }

        uint256 last = s.lastRate;
        if (last != 0 && g.maxDropBps != 0 && rate < last) {
            uint256 drop = last - rate;
            if (drop * 10_000 > last * uint256(g.maxDropBps)) {
                s.flagged = true;
                emit AssetFlagged(asset, last, rate);
            }
        }

        s.lastRate = rate;
        s.lastPoke = uint64(block.timestamp);
        emit Poked(asset, rate, s.lastPoke);
    }

    // ----------------------------------------------------------------- internal

    function _checkGuards(address asset, AssetState storage s, uint256 rate, uint256 updatedAt) internal view {
        GuardConfig memory g = s.guards;

        if (g.maxAge != 0 && block.timestamp > updatedAt + g.maxAge) {
            revert StaleRate(asset, updatedAt, g.maxAge);
        }

        uint256 last = s.lastRate;
        if (last == 0) return; // no checkpoint yet — allow (bootstrap via poke ASAP)

        if (g.maxDeviationBps != 0) {
            uint256 diff = rate > last ? rate - last : last - rate;
            if (diff * 10_000 > last * uint256(g.maxDeviationBps)) {
                revert DeviationExceeded(asset, last, rate);
            }
        }

        if (g.maxDropBps != 0 && rate < last) {
            uint256 drop = last - rate;
            if (drop * 10_000 > last * uint256(g.maxDropBps)) {
                revert MonotonicDrop(asset, last, rate);
            }
        }
    }
}
