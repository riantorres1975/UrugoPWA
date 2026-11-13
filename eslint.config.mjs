import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn"
    }
  },
  {
    ignores: [
      ".next/**",
      ".cache/**", // Generated local previews and bundled third-party code.
      "out/**",
      "build/**",
      "node_modules/**",
      "public/sw.js"
    ]
  }
];

export default config;
