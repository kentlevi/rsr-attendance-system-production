const fs = require('fs');
const content = fs.readFileSync('src/components/EmployeePortal.tsx', 'utf-8');

function countTags(str) {
  const openTags = (str.match(/<div/g) || []).length;
  const closeTags = (str.match(/<\/div>/g) || []).length;
  return { openTags, closeTags };
}

const lines = content.split('\n');
let diff = 0;
for (let i = 404; i < lines.length; i++) {
  const { openTags, closeTags } = countTags(lines[i]);
  diff += openTags - closeTags;
  
  // if diff goes negative or reaches final, log it
  if (diff < 0) console.log("NEGATIVE DIFF AT", i+1, lines[i]);
}

console.log("Final diff:", diff);
