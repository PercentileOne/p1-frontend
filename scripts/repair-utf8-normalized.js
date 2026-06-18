import fs from "fs";
import path from "path";

const careersDir = path.resolve("src/data/careers");
console.log("NORMALIZER PATH:", careersDir);
// Full Unicode normalization (Option 2)
function normalizeUnicode(text) {
  return (
    text

      // Pound sign
      .replace(/Â£/g, "£")

      // En dash / Em dash / NB hyphen
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/â€‘/g, "‑")

      // Smart quotes
      .replace(/â€œ/g, "“")
      .replace(/â€/g, "”")
      .replace(/â€˜/g, "‘")
      .replace(/â€™/g, "’")

      // Broken dash sequences
      .replace(/â��/g, "—")

      // Remove stray control characters
      .replace(/[\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007]/g, "")
      .replace(/[\u0008\u000B\u000C\u000E\u000F]/g, "")
      .replace(/[\u0010-\u001F]/g, "")

      // Normalize CRLF weirdness
      .replace(/\r\r\n/g, "\r\n")
      .replace(/\r\n\r\n+/g, "\r\n\r\n")
  );
}

function repairFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");

  const cleaned = normalizeUnicode(original);

  try {
    JSON.parse(cleaned);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  fs.writeFileSync(filePath, cleaned, "utf8");
  return { ok: true };
}

function repairAll() {
  const files = fs.readdirSync(careersDir).filter((f) => f.endsWith(".json"));

  console.log(`\n🛠 UTF‑8 normalization for ${files.length} files...\n`);

  let repaired = 0;
  let failed = 0;

  files.forEach((file, index) => {
    const filePath = path.join(careersDir, file);
    const result = repairFile(filePath);

    if (result.ok) {
      repaired++;
      console.log(`[${index + 1}/${files.length}] ${file} → repaired`);
    } else {
      failed++;
      console.log(
        `[${index + 1}/${files.length}] ${file} → still invalid (${result.error})`,
      );
    }
  });

  console.log(`\n✨ UTF‑8 normalization complete.`);
  console.log(`   Repaired: ${repaired}`);
  console.log(`   Still invalid: ${failed}\n`);
}

repairAll();
