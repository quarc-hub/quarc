import { Plugin } from 'esbuild';

export function consoleTransformer(): Plugin {
    return {
        name: 'console-transformer',
        setup(build) {
            build.onLoad({ filter: /\.ts$/ }, async (args) => {
                const fs = await import('fs');
                const contents = fs.readFileSync(args.path, 'utf8');

                // Zastąp console.* z krótszymi zmiennymi
                let transformed = contents
                    .replace(/console\.log/g, '_log')
                    .replace(/console\.error/g, '_error')
                    .replace(/console\.warn/g, '_warn')
                    .replace(/console\.info/g, '_info')
                    .replace(/console\.debug/g, '_debug');

                // Dodaj deklaracje na początku pliku jeśli są używane
                if (transformed !== contents) {
                    const declarations = `
// Console shortcuts for size optimization
const _log = console.log;
const _error = console.error;
const _warn = console.warn;
const _info = console.info;
const _debug = console.debug;
`;
                    transformed = declarations + transformed;
                }

                return {
                    contents: transformed,
                    loader: 'ts'
                };
            });
        }
    };
}
