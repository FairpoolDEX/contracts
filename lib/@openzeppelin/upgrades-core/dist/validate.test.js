"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = __importDefault(require("ava"));
const hardhat_1 = require("hardhat");
const validate_1 = require("./validate");
const src_decoder_1 = require("./src-decoder");
const test = ava_1.default;
test.before(async (t) => {
    const buildInfo = await hardhat_1.artifacts.getBuildInfo('contracts/test/Validations.sol:HasEmptyConstructor');
    if (buildInfo === undefined) {
        throw new Error('Build info not found');
    }
    const solcOutput = buildInfo.output;
    const solcInput = buildInfo.input;
    const decodeSrc = src_decoder_1.solcInputOutputDecoder(solcInput, solcOutput);
    t.context.validation = validate_1.validate(solcOutput, decodeSrc);
});
function testValid(name, valid) {
    test(name, t => {
        const version = validate_1.getContractVersion(t.context.validation, name);
        t.is(validate_1.isUpgradeSafe([t.context.validation], version), valid);
    });
}
function testOverride(name, opts, valid) {
    const testName = name.concat(valid ? '_Allowed' : '_NotAllowed');
    test(testName, t => {
        const version = validate_1.getContractVersion(t.context.validation, name);
        const assertUpgSafe = () => validate_1.assertUpgradeSafe([t.context.validation], version, opts);
        if (valid) {
            t.notThrows(assertUpgSafe);
        }
        else {
            t.throws(assertUpgSafe);
        }
    });
}
testValid('HasEmptyConstructor', true);
testValid('HasConstantStateVariableAssignment', true);
testValid('HasStateVariable', true);
testValid('UsesImplicitSafeInternalLibrary', true);
testValid('UsesExplicitSafeInternalLibrary', true);
testValid('HasNonEmptyConstructor', false);
testValid('ParentHasNonEmptyConstructor', false);
testValid('AncestorHasNonEmptyConstructor', false);
testValid('HasStateVariableAssignment', false);
testValid('HasImmutableStateVariable', false);
testValid('HasSelfDestruct', false);
testValid('HasDelegateCall', false);
testValid('ImportedParentHasStateVariableAssignment', false);
testValid('UsesImplicitUnsafeInternalLibrary', false);
testValid('UsesExplicitUnsafeInternalLibrary', false);
testValid('UsesImplicitUnsafeExternalLibrary', false);
testValid('UsesExplicitUnsafeExternalLibrary', false);
// Linked external libraries are not yet supported
// see: https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
testValid('UsesImplicitSafeExternalLibrary', false);
testValid('UsesExplicitSafeExternalLibrary', false);
test('inherited storage', t => {
    const version = validate_1.getContractVersion(t.context.validation, 'StorageInheritChild');
    const layout = validate_1.getStorageLayout([t.context.validation], version);
    t.is(layout.storage.length, 8);
    for (let i = 0; i < layout.storage.length; i++) {
        t.is(layout.storage[i].label, `v${i}`);
        t.truthy(layout.types[layout.storage[i].type]);
    }
});
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
//# sourceMappingURL=validate.test.js.map