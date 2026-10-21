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

console.log('=== Checking where pm_ appears outside of t(...) ===');
for (const file of allFiles) {
  if (file.includes('i18n.ts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line contains pm_ but not as part of t('pm_...') or t("pm_...")
    if (line.includes('pm_')) {
      const stripped = line.replace(/t\(['"`]pm_[a-zA-Z0-9_]+['"`]\)/g, '');
      if (stripped.includes('pm_')) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
