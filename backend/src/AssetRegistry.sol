// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title AssetRegistry
/// @notice Basket config: enabled flag, hard weight cap, target weight (for passive routing).
contract AssetRegistry is Ownable2Step {
    uint16 public constant MAX_BPS = 10_000;
    uint16 public constant HARD_MAX_CAP_BPS = 3_000; // bounded-loss promise

    struct Config {
        uint16 capBps;
        uint16 targetBps;
        bool enabled;
        bool exists;
    }

    address[] private _assets;
    mapping(address => Config) private _config;

    event AssetAdded(address indexed token, uint16 capBps, uint16 targetBps);
    event AssetUpdated(address indexed token, uint16 capBps, uint16 targetBps, bool enabled);

    error ZeroAddress();
    error AlreadyRegistered();
    error NotRegistered();
    error CapTooHigh();
    error BadBps();

    constructor(address owner_) Ownable(owner_) {}

    function assetCount() external view returns (uint256) {
        return _assets.length;
    }

    function assetAt(uint256 i) external view returns (address) {
        return _assets[i];
    }

    function getAssets() external view returns (address[] memory) {
        return _assets;
    }

    function configOf(address token) external view returns (Config memory) {
        return _config[token];
    }

    function isEnabled(address token) external view returns (bool) {
        Config memory c = _config[token];
        return c.exists && c.enabled;
    }

    function addAsset(address token, uint16 capBps, uint16 targetBps, bool enabled) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (_config[token].exists) revert AlreadyRegistered();
        if (capBps == 0 || capBps > HARD_MAX_CAP_BPS) revert CapTooHigh();
        if (targetBps > MAX_BPS || targetBps > capBps) revert BadBps();

        _config[token] = Config({capBps: capBps, targetBps: targetBps, enabled: enabled, exists: true});
        _assets.push(token);
        emit AssetAdded(token, capBps, targetBps);
        emit AssetUpdated(token, capBps, targetBps, enabled);
    }

    function updateAsset(address token, uint16 capBps, uint16 targetBps, bool enabled) external onlyOwner {
        Config storage c = _config[token];
        if (!c.exists) revert NotRegistered();
        if (capBps == 0 || capBps > HARD_MAX_CAP_BPS) revert CapTooHigh();
        if (targetBps > MAX_BPS || targetBps > capBps) revert BadBps();
        c.capBps = capBps;
        c.targetBps = targetBps;
        c.enabled = enabled;
        emit AssetUpdated(token, capBps, targetBps, enabled);
    }
}
