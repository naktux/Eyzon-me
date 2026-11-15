import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default tseslint.config(
 { ignores: ["extension-dist/**", "public/tracking/**", "output/**"] },
 ...tseslint.configs.recommended,
 { files: ["**/*.{js,mjs,cjs}"], rules: { "@typescript-eslint/no-require-imports": "off" } },
 { files: ["**/*.{ts,tsx}"], plugins: { "react-hooks": hooks }, rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" } }
);
