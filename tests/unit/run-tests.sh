#!/bin/bash

echo "🧪 Uruchamianie wszystkich testów Quarc Framework"
echo "============================================="

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$TEST_DIR"

# Kompilacja testów
echo "🔨 Kompilacja testów TypeScript..."
npx tsc test-functionality.ts --target es2020 --module commonjs --outDir ./compiled --skipLibCheck
npx tsc test-style-injection.ts --target es2020 --module commonjs --outDir ./compiled --skipLibCheck

total_passed=0
total_failed=0

# Testy funkcjonalne
echo ""
echo "📂 Uruchamianie testów funkcjonalnych..."
echo "----------------------------------------"
if node compiled/tests/test-functionality.js; then
    echo "✅ Testy funkcjonalne przeszły"
    total_passed=$((total_passed + 1))
else
    echo "❌ Testy funkcjonalne nie przeszły"
    total_failed=$((total_failed + 1))
fi

# Testy stylów
echo ""
echo "📂 Uruchamianie testów wstrzykiwania stylów..."
echo "--------------------------------------------"
echo "⚠️  Uwaga: Testy stylów wymagają środowiska przeglądarki (JSDOM)"
if node compiled/tests/test-style-injection.js 2>/dev/null; then
    echo "✅ Testy stylów przeszły"
    total_passed=$((total_passed + 1))
else
    echo "❌ Testy stylów nie przeszły (uruchom w przeglądarce przez test-style-injection.html)"
    total_failed=$((total_failed + 1))
fi

echo ""
echo "============================================="
echo "📊 PODSUMOWANIE WSZYSTKICH TESTÓW"
echo "============================================="
echo "✅ Przeszło: $total_passed"
echo "❌ Niepowodzenia: $total_failed"

if [ $total_failed -eq 0 ]; then
    echo ""
    echo "✅ Wszystkie testy przeszły pomyślnie!"
    exit 0
else
    echo ""
    echo "❌ Niektóre testy nie przeszły!"
    echo "💡 Uruchom testy stylów w przeglądarce: open test-style-injection.html"
    exit 1
fi
