import { ValidationError } from './run';
export interface ValidationOptions {
    unsafeAllowCustomTypes?: boolean;
    unsafeAllowLinkedLibraries?: boolean;
}
export declare function withValidationDefaults(opts: ValidationOptions): Required<ValidationOptions>;
export declare function processExceptions(contractName: string, errorsToProcess: ValidationError[], opts: ValidationOptions): ValidationError[];
export declare function silenceWarnings(): void;
export declare function isSilencingWarnings(): boolean;
//# sourceMappingURL=overrides.d.ts.map