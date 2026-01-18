import { Type } from './type';

export interface PipeMetadata {
    name: string;
    pure: boolean;
}

export class PipeRegistry {
    private static instance: PipeRegistry;
    private pipes = new Map<string, Type<any>>();
    private pipeMetadata = new Map<Type<any>, PipeMetadata>();

    private constructor() {}

    static get(): PipeRegistry {
        if (!PipeRegistry.instance) {
            PipeRegistry.instance = new PipeRegistry();
        }
        return PipeRegistry.instance;
    }

    register(pipeType: Type<any>): void {
        const metadata = (pipeType as any)._quarcPipe?.[0];
        if (!metadata) {
            return;
        }

        const pipeName = metadata.name;
        const pure = metadata.pure !== false;

        this.pipes.set(pipeName, pipeType);
        this.pipeMetadata.set(pipeType, { name: pipeName, pure });
    }

    getPipe(name: string): Type<any> | undefined {
        return this.pipes.get(name);
    }

    getPipeMetadata(pipeType: Type<any>): PipeMetadata | undefined {
        return this.pipeMetadata.get(pipeType);
    }

    getAllPipes(): Map<string, Type<any>> {
        return new Map(this.pipes);
    }
}
