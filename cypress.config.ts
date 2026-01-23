import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    requestTimeout: 10000,
    responseTimeout: 10000,
    defaultCommandTimeout: 5000,
    
    env: {
      AUTH_PASSWORD: "thisistheauthpassword!!!!",
      BASE_URL: "http://localhost:3000",
    },
    /**
     * Implement node event listeners here
     * @param on - The Cypress event listener object
     * @param config - The Cypress configuration object
     */
    setupNodeEvents(on, config) {},
  },
});