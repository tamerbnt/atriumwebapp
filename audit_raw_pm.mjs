import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('src/components/screens/project').map(f => path.join('src/components/screens/project', f));

// Check for JSX text that is not inside t(...)
console.log('=== Checking for hardcoded strings or raw pm_ in src/components/screens/project ===');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line contains raw pm_ that might be displayed
    if (line.includes('pm_') && !line.includes('t(\'') && !line.includes('t("') && !line.includes('setActiveScreen') && !line.includes('setSubScreen') && !line.includes('activeScreen ===') && !line.includes('initialTab') && !line.includes('import')) {
      console.log(`[RAW PM KEY/STR] ${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}
