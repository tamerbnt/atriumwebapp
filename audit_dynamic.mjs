import fs from 'fs';
import path from 'path';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllFiles('src');

console.log('=== Checking dynamic t(...) calls ===');
for (const file of allFiles) {
  if (file.includes('i18n.ts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  // Match t(...) calls
  const matches = content.matchAll(/\bt\(([^,)]+)/g);
  for (const m of matches) {
    const rawArg = m[1].trim();
    if (!rawArg.startsWith("'") && !rawArg.startsWith('"')) {
      console.log(`${file}: t(${rawArg})`);
    }
  }
}
