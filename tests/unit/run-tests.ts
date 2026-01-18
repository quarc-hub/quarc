#!/usr/bin/env node

/**
 * Główny skrypt do uruchamiania wszystkich testów Quarc
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const testDir = __dirname;

console.log('🧪 Uruchamianie wszystkich testów Quarc Framework\n');

// Lista plików testowych (tylko testy działające w Node.js)
// test-style-injection.ts i test-ngif-alias.ts wymagają środowiska przeglądarki (HTMLElement)
const testFiles = [
    'test-processors.ts',
    'test-inject.ts',
    'test-functionality.ts',
    'test-lifecycle.ts',
    'test-signals-reactivity.ts',
    'test-directives.ts',
];

let totalPassed = 0;
let totalFailed = 0;

for (const testFile of testFiles) {
    const testPath = join(testDir, testFile);

    if (!existsSync(testPath)) {
        console.log(`⚠️  Plik testowy nie istnieje: ${testFile}`);
        continue;
    }

    console.log(`\n📂 Uruchamianie testów z: ${testFile}`);
    console.log('─'.repeat(50));

    try {
        // Uruchom test przez ts-node lub node (jeśli skompilowany)
        const isCompiled = testFile.endsWith('.js');
        const command = isCompiled
            ? `node "${testPath}"`
            : `npx ts-node "${testPath}"`;

        const output = execSync(command, {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: testDir
        });

        console.log(output);

        // Próba wyodrębnienia wyników
        const lines = output.split('\n');
        const summaryLine = lines.find(line => line.includes('✅') || line.includes('❌'));

        if (summaryLine) {
            const passed = (summaryLine.match(/✅/g) || []).length;
            const failed = (summaryLine.match(/❌/g) || []).length;
            totalPassed += passed;
            totalFailed += failed;
        }

    } catch (error: any) {
        console.error(`❌ Błąd podczas uruchamiania ${testFile}:`);
        console.error(error.stdout || error.message);
        totalFailed++;
    }
}

console.log('\n' + '='.repeat(60));
console.log('📊 PODSUMOWANIE WSZYSTKICH TESTÓW');
console.log('='.repeat(60));
console.log(`✅ Przeszło: ${totalPassed}`);
console.log(`❌ Niepowodzenia: ${totalFailed}`);
console.log(`📈 Współczynnik sukcesu: ${totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);

if (totalFailed > 0) {
    console.log('\n❌ Niektóre testy nie przeszły!');
    process.exit(1);
} else if (totalPassed === 0) {
    console.log('\n⚠️  Żadne testy nie zostały uruchomione!');
    process.exit(1);
} else {
    console.log('\n✅ Wszystkie testy przeszły pomyślnie!');
    process.exit(0);
}
