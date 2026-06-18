import fs from "fs";
import path from "path";

const careersDir = path.resolve("src/data/careers");

// Utility: clean array lines
function fixArrayBlock(lines) {
  const cleaned = [];

  for (let line of lines) {
    // Trim whitespace
    let trimmed = line.trim();

    // Remove stray trailing commas after closing quotes
    trimmed = trimmed.replace(/",\s*$/, '",');

    // Fix missing commas between quoted strings
    trimmed = trimmed.replace(/"(\s*)"(?=\s*")/g, '"$1",');

    // Remove empty elements like "" or ","
    if (trimmed === '""' || trimmed === '",') continue;

    cleaned.push(trimmed);
  }

  return cleaned;
}

function repairFile(filePath) {
  let raw = fs.readFileSync(filePath, "utf8");

  // Split into lines
  const lines = raw.split(/\r?\n/);

  let inArray = false;
  let arrayStart = -1;
  let arrayLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect start of an array
    if (line.endsWith(": [")) {
      inArray = true;
      arrayStart = i;
      arrayLines = [];
      continue;
    }

    // Detect end of an array
    if (inArray && line === "],") {
      inArray = false;

      // Fix the array block
      const fixed = fixArrayBlock(arrayLines);

      // Rebuild the array
      const rebuilt = [
        lines[arrayStart],
        ...fixed.map((l) => "    " + l),
        "  ],",
      ];

      // Replace the original block
      lines.splice(arrayStart, arrayLines.length + 2, ...rebuilt);

      continue;
    }

    // Collect array lines
    if (inArray) {
      arrayLines.push(line);
    }
  }

  const rebuiltContent = lines.join("\n");

  // Validate JSON
  try {
    JSON.parse(rebuiltContent);
  } catch (err) {
    console.log(`❌ Still invalid: ${path.basename(filePath)}`);
    console.log(`   → ${err.message}`);
    return false;
  }

  // Save repaired file
  fs.writeFileSync(filePath, rebuiltContent, "utf8");
  console.log(`✅ Repaired structurally: ${path.basename(filePath)}`);
  return true;
}

function repairAll() {
  const files = fs.readdirSync(careersDir).filter((f) => f.endsWith(".json"));

  console.log(`\n🛠 Structural repair for ${files.length} files...\n`);

  let repaired = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(careersDir, file);
    const ok = repairFile(filePath);
    if (ok) repaired++;
    else failed++;
  }

  console.log(`\n✨ Structural repair complete.`);
  console.log(`   Repaired: ${repaired}`);
  console.log(`   Still invalid: ${failed}\n`);
}

repairAll();
