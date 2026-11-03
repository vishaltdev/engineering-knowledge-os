import { copyFile } from "node:fs/promises";

await copyFile(
  new URL("../server/src/main/resources/concepts.json", import.meta.url),
  new URL("./dist/concepts.json", import.meta.url),
);
