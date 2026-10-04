/** @type {import('jest').Config} */
export default {
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	transform: {
		"^.+\\.ts$": ["@swc/jest", { jsc: { parser: { syntax: "typescript" }, target: "es2022" }, module: { type: "commonjs" } }]
	}
};
