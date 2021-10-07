import { terser } from "rollup-plugin-terser";
export default {
    input: "src/qr-path.mjs",
    output: [
        {
            file: "dist/qr-path.cjs",
            format: "cjs",
            exports: "default"
        },
        {
            file: "dist/qr-path.min.js",
            format: "iife",
            name: "QRPath",
            plugins: [terser()]
        }
    ]
}
