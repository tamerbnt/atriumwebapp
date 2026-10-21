import fs from 'fs';
import path from 'path';

const dir = 'src/components/screens/project';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`\n=================== ${file} ===================`);
  // Find lines that might have raw text in JSX: e.g. >Some Text< or placeholder="Some Text" or title="Some Text"
  // but ignore comments, imports, svg, console.log
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (trimmed.includes('console.')) return;

    // Check for hardcoded text inside JSX tags: >...<
    const tagMatch = trimmed.match(/>([^<>{}\n]+)</);
    if (tagMatch) {
      const text = tagMatch[1].trim();
      // filter out purely numeric or single symbol or whitespace
      if (text.length > 2 && /[a-zA-Z\u00C0-\u017F]/.test(text) && !text.startsWith('&')) {
        // check if it's not a common word like DZD or null
        if (!['DZD', 'TTC', 'HT', 'ID', 'PDF', 'XLS', 'CSV', 'CCP', 'RIP', 'N/A', 'OK', 'PNG', 'JPG'].includes(text)) {
          console.log(`L${idx + 1}: [JSX TEXT] "${text}"`);
        }
      }
    }

    // Check for raw placeholder="..." or title="..."
    const attrMatch = trimmed.match(/(placeholder|title|aria-label)=["']([^"']+)["']/);
    if (attrMatch) {
      const attr = attrMatch[1];
      const val = attrMatch[2];
      if (val.length > 2 && /[a-zA-Z\u00C0-\u017F]/.test(val) && !val.startsWith('{')) {
        console.log(`L${idx + 1}: [${attr}] "${val}"`);
      }
    }
  });
}
