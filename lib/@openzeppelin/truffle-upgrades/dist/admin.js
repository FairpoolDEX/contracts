"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.getManifestAdmin = void 0;
const upgrades_core_1 = require("@openzeppelin/upgrades-core");
const factories_1 = require("./factories");
const wrap_provider_1 = require("./wrap-provider");
const options_1 = require("./options");
async function changeProxyAdmin(proxyAddress, newAdmin, opts = {}) {
    const { deployer } = options_1.withDefaults(opts);
    const provider = wrap_provider_1.wrapProvider(deployer.provider);
    const admin = await getManifestAdmin(provider);
    const proxyAdminAddress = await upgrades_core_1.getAdminAddress(provider, proxyAddress);
    if (admin.address !== proxyAdminAddress) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
    }
    else if (admin.address !== newAdmin) {
        await admin.changeProxyAdmin(proxyAddress, newAdmin);
    }
}
async function transferProxyAdminOwnership(newOwner, opts = {}) {
    const { deployer } = options_1.withDefaults(opts);
    const provider = wrap_provider_1.wrapProvider(deployer.provider);
    const admin = await getManifestAdmin(provider);
    await admin.transferOwnership(newOwner);
}
async function getInstance(opts = {}) {
    const { deployer } = options_1.withDefaults(opts);
    const provider = wrap_provider_1.wrapProvider(deployer.provider);
    return await getManifestAdmin(provider);
}
async function getManifestAdmin(provider) {
    const manifest = await upgrades_core_1.Manifest.forNetwork(provider);
    const manifestAdmin = await manifest.getAdmin();
    const AdminFactory = factories_1.getProxyAdminFactory();
    const proxyAdminAddress = manifestAdmin === null || manifestAdmin === void 0 ? void 0 : manifestAdmin.address;
    if (proxyAdminAddress === undefined) {
        throw new Error('No ProxyAdmin was found in the network manifest');
    }
    return new AdminFactory(proxyAdminAddress);
}
exports.getManifestAdmin = getManifestAdmin;
exports.admin = {
    getInstance,
    transferProxyAdminOwnership,
    changeProxyAdmin,
};
//# sourceMappingURL=admin.js.map