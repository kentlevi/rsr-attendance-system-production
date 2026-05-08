const fs = require('fs');
const content = fs.readFileSync('src/components/EmployeePortal.tsx', 'utf-8');

function countTags(str) {
  const openTags = (str.match(/<div/g) || []).length;
  const closeTags = (str.match(/<\/div>(?![\w\-])/g) || []).length;
  return { openTags, closeTags };
}

const lines = content.split('\n');
let diff = 0;
for (let i = 404; i < lines.length; i++) {
  const { openTags, closeTags } = countTags(lines[i]);
  diff += openTags - closeTags;
  if(openTags !== closeTags || lines[i].includes(') : activeTab ===')) {
     console.log(`Line ${i + 1} | +${openTags} -${closeTags} | Diff: ${diff} | ${lines[i].trim().substring(0, 50)}`);
  }
}
