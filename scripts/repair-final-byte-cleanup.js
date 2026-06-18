import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const careersDir = path.join(__dirname, "..", "src", "data", "careers");

function cleanEnding(raw) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/[^\S\r\n]+$/g, "")
    .replace(/[\u0000-\u001F]+$/g, "");
}

function ensureNewline(str) {
  return str.endsWith("\n") ? str : str + "\n";
}

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

console.log("🧹 Cleaning final-byte corruption in career files...\n");

const files = fs.readdirSync(careersDir).filter((f) => f.endsWith(".json"));

let repaired = 0;
let skipped = 0;

for (const file of files) {
  const fullPath = path.join(careersDir, file);
  let raw = fs.readFileSync(fullPath, "utf8");

  const cleaned = ensureNewline(cleanEnding(raw));

  if (cleaned === raw) {
    skipped++;
    continue;
  }

  if (isValidJSON(cleaned)) {
    fs.writeFileSync(fullPath, cleaned, "utf8");
    console.log(`${file} → repaired`);
    repaired++;
  } else {
    console.log(`${file} → still invalid after cleanup`);
  }
}

console.log(`\n✨ Cleanup complete.`);
console.log(`Repaired: ${repaired}`);
console.log(`Skipped (already clean): ${skipped}`);
