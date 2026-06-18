import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const careersDir = path.join(__dirname, "..", "src", "data", "careers");

console.log("VALIDATOR PATH:", careersDir);

function validateJsonFiles() {
  const files = fs.readdirSync(careersDir).filter((f) => f.endsWith(".json"));

  console.log(`\n🔍 Validating ${files.length} career JSON files...\n`);

  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(careersDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    try {
      JSON.parse(content);
    } catch (err) {
      errorCount++;
      console.log(`❌ Invalid JSON: ${file}`);
      console.log(`   → ${err.message}\n`);
    }
  }

  if (errorCount === 0) {
    console.log("✅ All JSON files are valid!");
  } else {
    console.log(
      `\n⚠️ Found ${errorCount} invalid JSON file(s). Fix these to continue.\n`,
    );
  }
}

validateJsonFiles();
