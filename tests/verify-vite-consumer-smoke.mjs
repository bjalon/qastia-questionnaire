import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = new URL("../node_modules/.tmp/form-runtime-vite-smoke/assets/", import.meta.url);
const assets = await readdir(assetsDir);
const jsAssets = assets.filter((asset) => asset.endsWith(".js"));

assert.ok(jsAssets.length > 0, "Vite consumer smoke build should emit JavaScript assets");

const bundle = (
  await Promise.all(jsAssets.map((asset) => readFile(join(assetsDir.pathname, asset), "utf8")))
).join("\n");

assert.match(bundle, /Formulaire|submit|question/i);
assert.doesNotMatch(bundle, /FormDesigner|QuestionPalette|FormInspector|sourceMutations/);
