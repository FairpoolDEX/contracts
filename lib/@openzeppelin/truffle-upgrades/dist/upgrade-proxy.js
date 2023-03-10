"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeProxy = exports.prepareUpgrade = void 0;
const upgrades_core_1 = require("@openzeppelin/upgrades-core");
const truffle_1 = require("./truffle");
const validate_1 = require("./validate");
const deploy_1 = require("./utils/deploy");
const factories_1 = require("./factories");
const wrap_provider_1 = require("./wrap-provider");
const options_1 = require("./options");
async function prepareUpgradeImpl(provider, manifest, proxyAddress, Contract, opts) {
    const { deployer, unsafeAllowCustomTypes } = opts;
    const { contracts_build_directory, contracts_directory } = truffle_1.getTruffleConfig();
    const validations = await validate_1.validateArtifacts(contracts_build_directory, contracts_directory);
    const linkedBytecode = await validate_1.getLinkedBytecode(Contract, provider);
    const version = upgrades_core_1.getVersion(Contract.bytecode, linkedBytecode);
    upgrades_core_1.assertUpgradeSafe([validations], version, opts);
    const currentImplAddress = await upgrades_core_1.getImplementationAddress(provider, proxyAddress);
    const deploymentLayout = await upgrades_core_1.getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    const layout = upgrades_core_1.getStorageLayout([validations], version);
    upgrades_core_1.assertStorageUpgradeSafe(deploymentLayout, layout, unsafeAllowCustomTypes);
    return await upgrades_core_1.fetchOrDeploy(version, provider, async () => {
        const deployment = await deploy_1.deploy(Contract, deployer);
        return { ...deployment, layout };
    });
}
async function prepareUpgrade(proxyAddress, Contract, opts = {}) {
    const requiredOpts = options_1.withDefaults(opts);
    const { deployer } = requiredOpts;
    const provider = wrap_provider_1.wrapProvider(deployer.provider);
    const manifest = await upgrades_core_1.Manifest.forNetwork(provider);
    return await prepareUpgradeImpl(provider, manifest, proxyAddress, Contract, requiredOpts);
}
exports.prepareUpgrade = prepareUpgrade;
async function upgradeProxy(proxyAddress, Contract, opts = {}) {
    const requiredOpts = options_1.withDefaults(opts);
    const { deployer } = requiredOpts;
    const provider = wrap_provider_1.wrapProvider(deployer.provider);
    const manifest = await upgrades_core_1.Manifest.forNetwork(provider);
    const AdminFactory = factories_1.getProxyAdminFactory(Contract);
    const admin = new AdminFactory(await upgrades_core_1.getAdminAddress(provider, proxyAddress));
    const manifestAdmin = await manifest.getAdmin();
    if (admin.address !== (manifestAdmin === null || manifestAdmin === void 0 ? void 0 : manifestAdmin.address)) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
    }
    const nextImpl = await prepareUpgradeImpl(provider, manifest, proxyAddress, Contract, requiredOpts);
    await admin.upgrade(proxyAddress, nextImpl);
    Contract.address = proxyAddress;
    return new Contract(proxyAddress);
}
exports.upgradeProxy = upgradeProxy;
//# sourceMappingURL=upgrade-proxy.js.map