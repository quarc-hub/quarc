import { QuarcConfig } from '../types';

export interface ProcessorContext {
    filePath: string;
    fileDir: string;
    source: string;
    config?: QuarcConfig;
}

export interface ProcessorResult {
    source: string;
    modified: boolean;
}

export abstract class BaseProcessor {
    abstract get name(): string;

    abstract process(context: ProcessorContext): Promise<ProcessorResult>;

    protected shouldSkipFile(source: string): boolean {
        return !source.includes('class ') && !source.includes('template');
    }

    protected noChange(source: string): ProcessorResult {
        return { source, modified: false };
    }

    protected changed(source: string): ProcessorResult {
        return { source, modified: true };
    }
}
