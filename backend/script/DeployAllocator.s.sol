// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RateReader} from "../src/RateReader.sol";
import {ShMONRateAdapter} from "../src/adapters/ShMONRateAdapter.sol";
import {ERC4626RateAdapter} from "../src/adapters/ERC4626RateAdapter.sol";
import {UniswapV3SwapAdapter} from "../src/adapters/UniswapV3SwapAdapter.sol";
import {iMONVault} from "../src/iMONVault.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {YieldOracle} from "../src/YieldOracle.sol";
import {IRateAdapter} from "../src/interfaces/IRateAdapter.sol";
import {IRateReader} from "../src/interfaces/IRateReader.sol";
import {ISwapAdapter} from "../src/interfaces/ISwapAdapter.sol";

/// @notice Deploy vault v2 with multi-LST + YieldOracle for max-APR rotation (within caps).
contract DeployAllocatorScript is Script {
    address constant SHMON = 0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c;
    address constant GMON = 0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081;
    address constant APRMON = 0x0c65A0BC65a5D819235B71F554D210D3F80E0852;
    address constant SWAP_ROUTER_02 = 0xfE31F71C1b106EAc32F1A19239c9a9A72ddfb900;
    address constant V3_FACTORY = 0x204FAca1764B154221e35c0d20aBb3c525710498;
    address constant WMON = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;
    uint24 constant FEE_100 = 100; // deepest LST/WMON tier on Monad

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        require(block.chainid == 143, "not monad");

        vm.startBroadcast(pk);

        RateReader reader = new RateReader(deployer);
        AssetRegistry registry = new AssetRegistry(deployer);
        YieldOracle oracle = new YieldOracle(deployer, IRateReader(address(reader)));

        ShMONRateAdapter shAdapter = new ShMONRateAdapter(SHMON);
        ERC4626RateAdapter gAdapter = new ERC4626RateAdapter(GMON);
        ERC4626RateAdapter aprAdapter = new ERC4626RateAdapter(APRMON);

        RateReader.GuardConfig memory guards =
            RateReader.GuardConfig({maxAge: 1 days, maxDeviationBps: 1000, maxDropBps: 500});

        reader.setAdapter(SHMON, IRateAdapter(address(shAdapter)), guards);
        reader.setAdapter(GMON, IRateAdapter(address(gAdapter)), guards);
        reader.setAdapter(APRMON, IRateAdapter(address(aprAdapter)), guards);
        reader.poke(SHMON);
        reader.poke(GMON);
        reader.poke(APRMON);

        registry.addAsset(SHMON, 3000, 2500, true);
        registry.addAsset(GMON, 3000, 2500, true);
        registry.addAsset(APRMON, 1500, 1500, true); // thinner — smaller cap

        iMONVault vault = new iMONVault("iMON Index", "iMON", IRateReader(address(reader)), deployer);
        vault.setRegistry(registry);
        vault.setYieldOracle(oracle);
        vault.setKeeper(deployer);
        vault.addAsset(SHMON);
        vault.addAsset(GMON);
        vault.addAsset(APRMON);

        // Multi-hop LST→WMON→LST at fee=100 (live Monad pools). Auto-route deposits to max APR.
        UniswapV3SwapAdapter swapAdapter =
            new UniswapV3SwapAdapter(SWAP_ROUTER_02, V3_FACTORY, WMON, FEE_100, address(vault));
        vault.setSwapAdapter(ISwapAdapter(address(swapAdapter)));
        vault.setWmon(WMON);
        vault.setAutoRouteDeposits(true);

        oracle.record(SHMON);
        oracle.record(GMON);
        oracle.record(APRMON);

        vm.stopBroadcast();

        console2.log("RateReader", address(reader));
        console2.log("AssetRegistry", address(registry));
        console2.log("YieldOracle", address(oracle));
        console2.log("iMONVault", address(vault));
        console2.log("UniswapV3SwapAdapter", address(swapAdapter));
        console2.log("ShMONRateAdapter", address(shAdapter));
        console2.log("gMON adapter", address(gAdapter));
        console2.log("aprMON adapter", address(aprAdapter));
    }
}
