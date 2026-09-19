import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("function getActivePublicProducts()");
const end = app.indexOf("async function fetchPublicProductCatalog()", start);
assert.ok(start >= 0 && end > start);

const context = vm.createContext({
  PUBLIC_PRODUCT_CATALOG: [
    { id: "zero", active: true, stock: 0, sortOrder: 1 },
    { id: "available", active: true, stock: 3, sortOrder: 2 },
    { id: "unlimited", active: true, stock: null, sortOrder: 3 },
    { id: "hidden", active: false, stock: 9, sortOrder: 4 },
  ],
});
vm.runInContext(app.slice(start, end), context);
assert.deepEqual(
  Array.from(context.getActivePublicProducts(), (product) => product.id),
  ["available", "unlimited"],
);

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
assert.match(html, /app\.js\?v=20260920-product-shipping-rules-1/);
console.log("public zero-stock product visibility: PASS");
