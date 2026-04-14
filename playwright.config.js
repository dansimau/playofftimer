const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3847',
  },
  webServer: {
    command: 'python3 -m http.server 3847',
    port: 3847,
    reuseExistingServer: true,
  },
});
