import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "artifacts/smart-budget/dist");
const target = resolve(root, "artifacts/api-server/dist");

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
