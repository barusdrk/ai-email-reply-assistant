const fs = require('fs');
const path = require('path');
const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
function walk(dir) {
  let results = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      results = results.concat(walk(p));
    } else if (exts.includes(path.extname(name))) {
      results.push(p);
    }
  }
  return results;
}
const files = walk(process.cwd());
const relImportRegex = /((?:import|export)\s+[\s\S]*?from\s*|(?:import|require|await\s+import)\s*\()?['\"](\.\.[^'\"\s]+|\.[^'\"\s]+)['\"]/g;
let total = 0;
let changedFiles = [];
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let updated = text.replace(relImportRegex, (match, prefix, imp) => {
    if (!imp.startsWith('./') && !imp.startsWith('../')) return match;
    if (imp.endsWith('.js') || imp.endsWith('.ts') || imp.endsWith('.tsx') || imp.endsWith('.jsx') || imp.endsWith('.mjs') || imp.endsWith('.cjs') || imp.endsWith('/')) return match;
    if (imp.includes('?') || imp.includes('#')) return match;
    total++;
    return match.replace(imp, imp + '.js');
  });
  if (updated !== text) {
    changedFiles.push(file);
    fs.writeFileSync(file, updated, 'utf8');
  }
}
console.log('updated files:', changedFiles.length);
for (const f of changedFiles) console.log(f);
console.log('total replacements:', total);
