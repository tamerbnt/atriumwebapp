import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  let list = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) list = list.concat(getFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) list.push(full);
  }
  return list;
}

const files = getFiles('src');
console.log('=== Checking for dynamic t(...) calls ===');

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, idx) => {
    // Match t( NOT followed by quote
    const matches = l.matchAll(/\bt\(\s*([^"'\`\s\)]+)/g);
    for (const m of matches) {
      if (!['language', 'key'].includes(m[1])) {
        console.log(`${file}:${idx + 1}: t(${m[1]}) in -> ${l.trim().slice(0, 90)}`);
      }
    }
    // Also match t(`...`) template literals
    const templateMatches = l.matchAll(/\bt\(\s*`([^`]+)`/g);
    for (const tm of templateMatches) {
      console.log(`${file}:${idx + 1}: t(\`${tm[1]}\`) in -> ${l.trim().slice(0, 90)}`);
    }
  });
}
