// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRateAdapter} from "../../src/interfaces/IRateAdapter.sol";

/// @notice Controllable adapter for RateReader unit tests (yield up / crash / stale).
contract MockRateAdapter is IRateAdapter {
    address public immutable override asset;
    uint256 public rate;
    uint256 public updatedAt;
    bool public revertOnRead;

    constructor(address asset_, uint256 rate_) {
        asset = asset_;
        rate = rate_;
        updatedAt = block.timestamp;
    }

    function setRate(uint256 rate_) external {
        rate = rate_;
        updatedAt = block.timestamp;
    }

    function setUpdatedAt(uint256 ts) external {
        updatedAt = ts;
    }

    function setRevertOnRead(bool v) external {
        revertOnRead = v;
    }

    function readRate() external view returns (uint256, uint256) {
        require(!revertOnRead, "read reverted");
        return (rate, updatedAt);
    }
}
