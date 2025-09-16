/* scripts/copy-pdf-worker.cjs
 * Copia o worker do pdf.js para /public de forma robusta (Windows/Mac/Linux)
 * Compatível com várias versões do pdfjs-dist (3, 4, 5…).
 */
const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Locais possíveis do worker dependendo da versão do pdfjs-dist
const candidates = [
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "node_modules/pdfjs-dist/build/pdf.worker.mjs",
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js",
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.js",
  "node_modules/pdfjs-dist/build/pdf.worker.min.js",
  "node_modules/pdfjs-dist/build/pdf.worker.js",
];

function copy(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`✓ Copiado: ${src} → ${dest}`);
}

function run() {
  const found = candidates.find((rel) => fs.existsSync(path.join(projectRoot, rel)));
  if (!found) {
    console.warn("⚠️  Não encontrei o pdf.worker em pdfjs-dist. Verifique se 'pdfjs-dist' está instalado.");
    console.warn("   Tente: npm i pdfjs-dist");
    process.exit(0);
  }

  const srcAbs = path.join(projectRoot, found);
  const isMjs = found.endsWith(".mjs");

  // Gerar *todos* os nomes comuns para evitar ajuste no código
  const targets = [
    path.join(publicDir, "pdf.worker.min.mjs"),
    path.join(publicDir, "pdf.worker.mjs"),
    path.join(publicDir, "pdf.worker.min.js"),
    path.join(publicDir, "pdf.worker.js"),
  ];

  // Copia mantendo a extensão original quando possível; depois duplica com os demais nomes
  const primaryTarget = path.join(publicDir, isMjs ? "pdf.worker.min.mjs" : "pdf.worker.min.js");
  copy(srcAbs, primaryTarget);

  // Replica para os outros nomes, se não existirem
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      try { copy(primaryTarget, t); } catch {}
    }
  }
  console.log("✅ Worker do PDF pronto em /public (vários nomes gerados).");
}

run();
