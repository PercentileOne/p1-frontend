import fs from "fs";
import path from "path";

// Directory containing your career JSON files
const careersDir = path.resolve("src/data/careers");

// Detect BOM (Byte Order Mark)
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

// Replace problematic Unicode punctuation with safe equivalents
function normalizeUnicode(str) {
  return str
    .replace(/\u2013|\u2014|\u2015|\u2212/g, "-") // en dash, em dash → hyphen
    .replace(/\u2018|\u2019/g, "'") // curly quotes → straight
    .replace(/\u201C|\u201D/g, '"') // curly double quotes → straight
    .replace(/\u00A0/g, " "); // non-breaking space → space
}

function normalizeFile(filePath) {
  let buffer = fs.readFileSync(filePath);

  // Try UTF-8 first
  let content = buffer.toString("utf8");

  // Strip BOM if present
  content = stripBOM(content);

  // Normalize punctuation
  content = normalizeUnicode(content);

  // Try parsing JSON
  try {
    JSON.parse(content);
  } catch (err) {
    console.log(
      `❌ Still invalid after normalization: ${path.basename(filePath)}`,
    );
    console.log(`   → ${err.message}`);
    return false;
  }

  // Write back as clean UTF-8
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
  console.log(`✅ Normalized: ${path.basename(filePath)}`);
  return true;
}

function normalizeAll() {
  const files = fs.readdirSync(careersDir).filter((f) => f.endsWith(".json"));

  console.log(`\n🧼 Normalizing encoding for ${files.length} JSON files...\n`);

  let fixed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(careersDir, file);
    const ok = normalizeFile(filePath);
    if (ok) fixed++;
    else failed++;
  }

  console.log(`\n✨ Encoding normalization complete.`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Still invalid: ${failed}\n`);
}

normalizeAll();
