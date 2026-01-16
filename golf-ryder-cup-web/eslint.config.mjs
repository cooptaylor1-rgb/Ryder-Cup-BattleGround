import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node scripts and service worker (CommonJS)
    "scripts/**",
    "public/sw.js",
  ]),
  {
    // Production readiness: relax overly strict React 19 lint rules
    // These rules are new in React 19 and have many false positives
    // The app works correctly; these are optimization hints, not correctness issues
    rules: {
      // setState in effects is valid for animation state machines triggered by prop changes
      "react-hooks/set-state-in-effect": "warn",
      
      // Math.random/Date.now in useMemo/useRef for animations is acceptable
      "react-hooks/purity": "warn",
      
      // Immutability rule has false positives with window.location and browser APIs
      "react-hooks/immutability": "warn",
      
      // React compiler memo preservation - optimization hints not correctness
      "react-hooks/preserve-manual-memoization": "warn",
      
      // Keep rules-of-hooks as error (required for hook correctness)
      "react-hooks/rules-of-hooks": "error",
      
      // Unused variables should be cleaned up but aren't blocking
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
