import fs from "fs";
import path from "path";

const careersDir = path.resolve("src/data/careers");

// Map of corrupted sequences → correct UTF‑8 characters
const replacements = [
  // Pound signs
  { bad: Buffer.from([0xC2, 0xA3]), good: "£" },

  // En dash (–)
  { bad: Buffer.from([0xE2, 0x80, 0x93]), good: "–" },

  // Em dash (—)
  { bad: Buffer.from([0xE2, 0x80, 0x94]), good: "—" },

  // NB hyphen (‑)
  { bad: Buffer.from([0xE2, 0x80, 0x91]), good: "‑" },

  // Smart quotes
  { bad: Buffer.from([0xE2, 0x80, 0x9C]), good: "“" },
  { bad: Buffer.from([0xE2, 0x80, 0x9D]), good: "”" },
  { bad: Buffer.from([0xE2, 0x80, 0x98]), good: "‘" },
  { bad: Buffer.from([0xE2, 0x80, 0x99]), good: "’" },

  // Remove stray control bytes (null, substitute, etc.)
  { bad: Buffer.from([0x00]), good: "" },
  { bad: Buffer.from([0x1A]), good: "" }
];

function repairBytes(buffer) {
  let output = Buffer.from(buffer);

  for (const { bad, good } of replacements) {
    let idx;
    while ((idx = output.indexOf(bad)) !== -1) {
      const before = output.slice(0, idx);
      const after = output.slice(idx + bad.length);
      output = Buffer.concat([before, Buffer.from(good, "utf8"), after]);
    }
  }

  return output;
}

function repairFile(filePath) {
  const raw = fs.readFileSync(filePath);

  const repaired = repairBytes(raw);

  const text = repaired.toString("utf8");

  try {
    JSON.parse(text);
  } catch (err) {
    console.log(`❌ Still invalid after UTF‑8 repair: ${path.basename(filePath)}`);
    console.log(`   → ${err.message}`);
    return false;
  }

  fs.writeFileSync(filePath, text, "utf8");
  console.log(`✅ UTF‑8 repaired: ${path.basename(filePath)}`);
  return true;
}

function repairAll() {
  const files = fs.readdirSync(careersDir).filter(f => f.endsWith(".json"));

  console.log(`\n🛠 UTF‑8 repair for ${files.length} files...\n`);

  let repaired = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(careersDir, file);
    const ok = repairFile(filePath);
    if (ok) repaired++;
    else failed++;
  }

  console.log(`\n✨ UTF‑8 repair complete.`);
  console.log(`   Repaired: ${repaired}`);
  console.log(`   Still invalid: ${failed}\n`);
}

repairAll();
