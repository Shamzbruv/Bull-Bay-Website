import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["legacy-static/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
