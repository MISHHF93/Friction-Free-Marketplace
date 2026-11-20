import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".next-playwright/**", ".next-smoke/**", "node_modules/**", "playwright-report/**", "test-results/**"]
  },
  ...nextVitals
];

export default config;
