"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSilencingWarnings = exports.silenceWarnings = exports.processExceptions = exports.withValidationDefaults = void 0;
const chalk_1 = __importDefault(require("chalk"));
function withValidationDefaults(opts) {
    var _a, _b;
    return {
        unsafeAllowCustomTypes: (_a = opts.unsafeAllowCustomTypes) !== null && _a !== void 0 ? _a : false,
        unsafeAllowLinkedLibraries: (_b = opts.unsafeAllowLinkedLibraries) !== null && _b !== void 0 ? _b : false,
    };
}
exports.withValidationDefaults = withValidationDefaults;
function processExceptions(contractName, errorsToProcess, opts) {
    const { unsafeAllowCustomTypes, unsafeAllowLinkedLibraries } = withValidationDefaults(opts);
    let errors = errorsToProcess;
    // Process `unsafeAllowCustomTypes` flag
    if (unsafeAllowCustomTypes) {
        errors = processOverride(contractName, errors, ['enum-definition', 'struct-definition'], `    \`unsafeAllowCustomTypes\` may not be necessary.\n` +
            `    Update your plugin for automated struct and enum checks.\n`);
    }
    // Process `unsafeAllowLinkedLibraries` flag
    if (unsafeAllowLinkedLibraries) {
        errors = processOverride(contractName, errors, ['external-library-linking'], `    You are using the \`unsafeAllowLinkedLibraries\` flag to include external libraries.\n` +
            `    Make sure you have manually checked that the linked libraries are upgrade safe.\n`);
    }
    return errors;
}
exports.processExceptions = processExceptions;
function processOverride(contractName, errorsToProcess, overrides, message) {
    let errors = errorsToProcess;
    let exceptionsFound = false;
    errors = errors.filter(error => {
        const isException = overrides.includes(error.kind);
        exceptionsFound = exceptionsFound || isException;
        return !isException;
    });
    if (exceptionsFound && !silenced) {
        console.error(chalk_1.default.keyword('orange').bold('Warning:') + ` Potentially unsafe deployment of ${contractName}\n\n` + message);
    }
    return errors;
}
let silenced = false;
function silenceWarnings() {
    if (!silenced) {
        console.error(chalk_1.default.keyword('orange').bold('Warning:') +
            ` All subsequent Upgrades warnings will be silenced.\n\n` +
            `    Make sure you have manually checked all uses of unsafe flags.\n`);
        silenced = true;
    }
}
exports.silenceWarnings = silenceWarnings;
function isSilencingWarnings() {
    return silenced;
}
exports.isSilencingWarnings = isSilencingWarnings;
//# sourceMappingURL=overrides.js.map