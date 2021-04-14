"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const utils_1 = require("solidity-ast/utils");
const ast_dereferencer_1 = require("../ast-dereferencer");
const is_nullish_1 = require("../utils/is-nullish");
const version_1 = require("../version");
const link_refs_1 = require("../link-refs");
const extract_1 = require("../storage/extract");
function validate(solcOutput, decodeSrc) {
    var _a;
    const validation = {};
    const fromId = {};
    const inheritIds = {};
    const libraryIds = {};
    const deref = ast_dereferencer_1.astDereferencer(solcOutput);
    for (const source in solcOutput.contracts) {
        for (const contractName in solcOutput.contracts[source]) {
            const bytecode = solcOutput.contracts[source][contractName].evm.bytecode;
            const version = bytecode.object === '' ? undefined : version_1.getVersion(bytecode.object);
            const linkReferences = link_refs_1.extractLinkReferences(bytecode);
            validation[contractName] = {
                version,
                inherit: [],
                libraries: [],
                linkReferences,
                errors: [],
                layout: {
                    storage: [],
                    types: {},
                },
            };
        }
        for (const contractDef of utils_1.findAll('ContractDefinition', solcOutput.sources[source].ast)) {
            fromId[contractDef.id] = contractDef.name;
            // May be undefined in case of duplicate contract names in Truffle
            const bytecode = (_a = solcOutput.contracts[source][contractDef.name]) === null || _a === void 0 ? void 0 : _a.evm.bytecode;
            if (contractDef.name in validation && bytecode !== undefined) {
                inheritIds[contractDef.name] = contractDef.linearizedBaseContracts.slice(1);
                libraryIds[contractDef.name] = getReferencedLibraryIds(contractDef);
                validation[contractDef.name].errors = [
                    ...getConstructorErrors(contractDef, decodeSrc),
                    ...getDelegateCallErrors(contractDef, decodeSrc),
                    ...getStateVariableErrors(contractDef, decodeSrc),
                    // TODO: add linked libraries support
                    // https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
                    ...getLinkingErrors(contractDef, bytecode),
                ];
                validation[contractDef.name].layout = extract_1.extractStorageLayout(contractDef, decodeSrc, deref);
            }
        }
    }
    for (const contractName in inheritIds) {
        validation[contractName].inherit = inheritIds[contractName].map(id => fromId[id]);
    }
    for (const contractName in libraryIds) {
        validation[contractName].libraries = libraryIds[contractName].map(id => fromId[id]);
    }
    return validation;
}
exports.validate = validate;
function* getConstructorErrors(contractDef, decodeSrc) {
    var _a, _b;
    for (const fnDef of utils_1.findAll('FunctionDefinition', contractDef)) {
        if (fnDef.kind === 'constructor' && (((_b = (_a = fnDef.body) === null || _a === void 0 ? void 0 : _a.statements.length) !== null && _b !== void 0 ? _b : 0) > 0 || fnDef.modifiers.length > 0)) {
            yield {
                kind: 'constructor',
                contract: contractDef.name,
                src: decodeSrc(fnDef),
            };
        }
    }
}
function* getDelegateCallErrors(contractDef, decodeSrc) {
    var _a, _b;
    for (const fnCall of utils_1.findAll('FunctionCall', contractDef)) {
        const fn = fnCall.expression;
        if ((_a = fn.typeDescriptions.typeIdentifier) === null || _a === void 0 ? void 0 : _a.match(/^t_function_baredelegatecall_/)) {
            yield {
                kind: 'delegatecall',
                src: decodeSrc(fnCall),
            };
        }
        if ((_b = fn.typeDescriptions.typeIdentifier) === null || _b === void 0 ? void 0 : _b.match(/^t_function_selfdestruct_/)) {
            yield {
                kind: 'selfdestruct',
                src: decodeSrc(fnCall),
            };
        }
    }
}
function* getStateVariableErrors(contractDef, decodeSrc) {
    for (const varDecl of contractDef.nodes) {
        if (utils_1.isNodeType('VariableDeclaration', varDecl)) {
            if (!varDecl.constant && !is_nullish_1.isNullish(varDecl.value)) {
                yield {
                    kind: 'state-variable-assignment',
                    name: varDecl.name,
                    src: decodeSrc(varDecl),
                };
            }
            if (varDecl.mutability === 'immutable') {
                yield {
                    kind: 'state-variable-immutable',
                    name: varDecl.name,
                    src: decodeSrc(varDecl),
                };
            }
        }
    }
}
function getReferencedLibraryIds(contractDef) {
    const implicitUsage = [...utils_1.findAll('UsingForDirective', contractDef)].map(usingForDirective => usingForDirective.libraryName.referencedDeclaration);
    const explicitUsage = [...utils_1.findAll('Identifier', contractDef)]
        .filter(identifier => { var _a; return (_a = identifier.typeDescriptions.typeString) === null || _a === void 0 ? void 0 : _a.match(/^type\(library/); })
        .map(identifier => {
        if (is_nullish_1.isNullish(identifier.referencedDeclaration)) {
            throw new Error('Broken invariant: Identifier.referencedDeclaration should not be null');
        }
        return identifier.referencedDeclaration;
    });
    return [...new Set(implicitUsage.concat(explicitUsage))];
}
function* getLinkingErrors(contractDef, bytecode) {
    const { linkReferences } = bytecode;
    for (const source of Object.keys(linkReferences)) {
        for (const libName of Object.keys(linkReferences[source])) {
            yield {
                kind: 'external-library-linking',
                name: libName,
                src: source,
            };
        }
    }
}
//# sourceMappingURL=run.js.map