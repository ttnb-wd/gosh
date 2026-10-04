/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only inventory of every application interface, including unmounted components.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? files(name) : /\.tsx$/.test(name) ? [name] : [];
  });
}
const inventory = [...files('app'), ...files('components')].sort().map(file => {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const controls = new Map();
  const imports = [];
  function visit(node) {
    if (ts.isImportDeclaration(node)) imports.push(node.moduleSpecifier.text);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(ast);
      controls.set(name, (controls.get(name) || 0) + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { file: file.replaceAll('\\', '/'), controls: Object.fromEntries(controls), imports,
    nativeAlerts: (source.match(/\b(?:alert|confirm)\(/g) || []).length,
    legacyColors: (source.match(/(?:bg|text|border|ring)-(?:yellow|blue|purple|zinc|neutral|gray)-\d|#[dD]4[aA][fF]37/g) || []).length,
    scrollListeners: (source.match(/addEventListener\(["']scroll/g) || []).length };
});
if (process.argv.includes('--json')) console.log(JSON.stringify(inventory, null, 2));
else {
  const routes = inventory.filter(item => /\/page\.tsx$/.test(item.file));
  console.log(`${routes.length} page files; ${inventory.length} interface source files audited.`);
  for (const item of inventory) console.log(`${item.file}: ${Object.entries(item.controls).filter(([name]) => !['div','span','p','br'].includes(name)).map(([name,count]) => `${name}×${count}`).join(', ')}${item.nativeAlerts ? `; native dialogs=${item.nativeAlerts}` : ''}${item.legacyColors ? `; legacy colors=${item.legacyColors}` : ''}`);
}
