// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RateReader} from "../src/RateReader.sol";
import {ShMONRateAdapter} from "../src/adapters/ShMONRateAdapter.sol";
import {iMONVault} from "../src/iMONVault.sol";
import {IRateAdapter} from "../src/interfaces/IRateAdapter.sol";
import {IRateReader} from "../src/interfaces/IRateReader.sol";

/// @notice Guarded Phase 1+2 mainnet deploy: RateReader + shMON adapter + vault.
/// @dev AssetRegistry / FeeController / Guardian land in Phase 3 — owner is the deployer
///      EOA for now. Basket starts with shMON only.
contract DeployScript is Script {
    address constant SHMON = 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("deployer", deployer);
        console2.log("chainid", block.chainid);
        require(block.chainid == 143, "not Monad mainnet");
        require(SHMON.code.length > 0, "shMON missing");

        vm.startBroadcast(pk);

        RateReader reader = new RateReader(deployer);
        ShMONRateAdapter adapter = new ShMONRateAdapter(SHMON);

        // Live ERC-4626 getter → updatedAt = now, so maxAge is a soft backstop.
        // 10% deviation / 5% sharp-drop — LST yield moves slowly; de-peg still trips.
        reader.setAdapter(
            SHMON,
            IRateAdapter(address(adapter)),
            RateReader.GuardConfig({maxAge: 1 days, maxDeviationBps: 1000, maxDropBps: 500})
        );
        reader.poke(SHMON);

        iMONVault vault = new iMONVault("iMON Index", "iMON", IRateReader(address(reader)), deployer);
        vault.addAsset(SHMON);

        vm.stopBroadcast();

        console2.log("RateReader", address(reader));
        console2.log("ShMONRateAdapter", address(adapter));
        console2.log("iMONVault", address(vault));
        console2.log("shMON rate", reader.rateOf(SHMON));
        console2.log("vault assets", vault.assetsLength());
    }
}
