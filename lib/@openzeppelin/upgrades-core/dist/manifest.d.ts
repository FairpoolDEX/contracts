import { EthereumProvider } from './provider';
import type { Deployment } from './deployment';
import type { StorageLayout } from './storage';
export interface ManifestData {
    manifestVersion: string;
    impls: {
        [version in string]?: ImplDeployment;
    };
    admin?: Deployment;
}
export interface ImplDeployment extends Deployment {
    layout: StorageLayout;
}
export declare class Manifest {
    readonly chainId: number;
    readonly file: string;
    private locked;
    static forNetwork(provider: EthereumProvider): Promise<Manifest>;
    constructor(chainId: number);
    getAdmin(): Promise<Deployment | undefined>;
    getDeploymentFromAddress(address: string): Promise<ImplDeployment>;
    read(): Promise<ManifestData>;
    write(data: ManifestData): Promise<void>;
    lockedRun<T>(cb: () => Promise<T>): Promise<T>;
    private lock;
}
export declare function migrateManifest(data: ManifestData): ManifestData;
//# sourceMappingURL=manifest.d.ts.map