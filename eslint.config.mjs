import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // tools/quiz has its own linter; public/tools holds the countdown's
    // plain browser scripts and the quiz's built bundle.
    ignores: ["legacy-static/**", ".next/**", "node_modules/**", "tools/**", "public/tools/**"],
  },
];

export default eslintConfig;
