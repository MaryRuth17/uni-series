import { defineConfig } from 'vitest/config';

// Unit tests cover the pure logic classes only (no Phaser, no browser), so they run in Node.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
