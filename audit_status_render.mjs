import fs from 'fs';
import path from 'path';

const dir = 'src/components/screens/project';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`\n=================== Checking status/type rendering in ${file} ===================`);
  lines.forEach((line, idx) => {
    // Check if line renders .status, .category, .role, or .type without t(...)
    if (/\.(status|category|role|type|stage)\b/.test(line)) {
      if (!line.includes('===') && !line.includes('!==') && !line.includes('const ') && !line.includes('filter(') && !line.includes('find(')) {
        console.log(`L${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
