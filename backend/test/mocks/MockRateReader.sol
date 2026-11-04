// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRateReader} from "../../src/interfaces/IRateReader.sol";

/// @notice Test-only rate source. Lets a test set each asset's MON-per-token rate,
///         so we can simulate yield (rate up) and a de-peg (rate down).
contract MockRateReader is IRateReader {
    mapping(address => uint256) public rate;

    function setRate(address asset, uint256 newRate) external {
        rate[asset] = newRate;
    }

    function rateOf(address asset) external view returns (uint256) {
        return rate[asset];
    }
}
