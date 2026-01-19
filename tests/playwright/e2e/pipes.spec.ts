import { test, expect } from '@playwright/test';

test.describe('Quarc Pipes E2E Tests', () => {

  test.describe('UpperCasePipe', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/uppercase');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('should transform hardcoded string', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should transform signal value', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should transform method call', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with || operator', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });

  test.describe('LowerCasePipe', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/lowercase');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('should transform hardcoded string', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should transform signal value', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should transform method call', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });

  test.describe('JsonPipe', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/json');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    const normalizeJson = (text: string | null) => {
      if (!text) return '';
      return text.replace(/\s+/g, '');
    };

    test('should transform number literal', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });

    test('should transform string literal', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });

    test('should transform boolean literal', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });

    test('should transform object with signal', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });

    test('should transform array with signal', async ({ page }) => {
      const result = await page.locator('#test-5 .result').textContent();
      const expected = await page.locator('#test-5 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });

    test('should transform object from method', async ({ page }) => {
      const result = await page.locator('#test-6 .result').textContent();
      const expected = await page.locator('#test-6 .expected').textContent();
      expect(normalizeJson(result)).toBe(normalizeJson(expected));
    });
  });

  test.describe('Case Pipes', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/case');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('CamelCasePipe should work', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('PascalCasePipe should work', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('SnakeCasePipe should work', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('KebabCasePipe should work', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with signal values', async ({ page }) => {
      const result = await page.locator('#test-5 .result').textContent();
      const expected = await page.locator('#test-5 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });

  test.describe('DatePipe', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/date');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('should format with yyyy-MM-dd', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should format with HH:mm:ss', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should use predefined shortDate format', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with method call', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });

  test.describe('SubstrPipe', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/substr');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('should work with start and length', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with start only', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with signal value', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should work with method call', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });

  test.describe('Pipe Chains', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/chain');
      await page.waitForSelector('#test-1', { timeout: 10000 });
    });

    test('should chain lowercase | uppercase', async ({ page }) => {
      const result = await page.locator('#test-1 .result').textContent();
      const expected = await page.locator('#test-1 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should chain uppercase | substr', async ({ page }) => {
      const result = await page.locator('#test-2 .result').textContent();
      const expected = await page.locator('#test-2 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should chain with signal value', async ({ page }) => {
      const result = await page.locator('#test-3 .result').textContent();
      const expected = await page.locator('#test-3 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should chain with method call', async ({ page }) => {
      const result = await page.locator('#test-4 .result').textContent();
      const expected = await page.locator('#test-4 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });

    test('should handle triple chain', async ({ page }) => {
      const result = await page.locator('#test-5 .result').textContent();
      const expected = await page.locator('#test-5 .expected').textContent();
      expect(result?.trim()).toBe(expected?.trim());
    });
  });
});
