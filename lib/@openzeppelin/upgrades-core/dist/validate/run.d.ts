import { SolcOutput } from '../solc-api';
import { SrcDecoder } from '../src-decoder';
import { Version } from '../version';
import { LinkReference } from '../link-refs';
import { StorageLayout } from '../storage/layout';
export declare type ValidationRunData = Record<string, ContractValidation>;
export interface ContractValidation {
    version?: Version;
    inherit: string[];
    libraries: string[];
    linkReferences: LinkReference[];
    errors: ValidationError[];
    layout: StorageLayout;
}
export declare type ValidationError = ValidationErrorConstructor | ValidationErrorOpcode | ValidationErrorWithName;
interface ValidationErrorBase {
    src: string;
}
interface ValidationErrorWithName extends ValidationErrorBase {
    name: string;
    kind: 'state-variable-assignment' | 'state-variable-immutable' | 'external-library-linking' | 'struct-definition' | 'enum-definition';
}
interface ValidationErrorConstructor extends ValidationErrorBase {
    kind: 'constructor';
    contract: string;
}
interface ValidationErrorOpcode extends ValidationErrorBase {
    kind: 'delegatecall' | 'selfdestruct';
}
export declare function validate(solcOutput: SolcOutput, decodeSrc: SrcDecoder): ValidationRunData;
export {};
//# sourceMappingURL=run.d.ts.map