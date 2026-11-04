// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ScaffoldCheck} from "../src/ScaffoldCheck.sol";

contract ScaffoldCheckTest is Test {
    ScaffoldCheck internal scaffold;

    function setUp() public {
        scaffold = new ScaffoldCheck();
    }

    function test_Ping() public view {
        assertTrue(scaffold.ping());
    }

    function test_Metadata() public view {
        assertEq(scaffold.NAME(), "iMON");
        assertEq(scaffold.PHASE(), 0);
    }
}
