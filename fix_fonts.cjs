const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walk(dirPath, callback);
    else callback(dirPath);
  });
}

walk('./src', function(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Step 1: Replace font sizes with nearest multiple of 4
  let modifiedContent = content.replace(/text-\[(\d+)px\]/g, (match, p1) => {
    let size = parseInt(p1, 10);
    let newSize = Math.round(size / 4) * 4;
    return `text-[${newSize}px]`;
  });

  // Step 2: Weight mapping
  modifiedContent = modifiedContent.replace(/className="([^"]+)"/g, (match, classList) => {
    let classes = classList.split(' ');
    
    let isTitleSize = classes.some(c => {
      let m = c.match(/^text-\[(\d+)px\]$/);
      if (m && parseInt(m[1], 10) >= 20) return true;
      if (['text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-lg'].includes(c)) return true;
      return false;
    });

    let newClasses = classes.map(c => {
      if (c === 'font-black') return 'font-bold';
      if (c === 'font-bold' && !isTitleSize) return 'font-semibold';
      if (c === 'font-semibold' && !isTitleSize) return 'font-medium';
      return c;
    });

    return `className="${newClasses.join(' ')}"`;
  });

  modifiedContent = modifiedContent.replace(/className=\{([^}]+)\}/g, (match, classBlock) => {
    let modifiedBlock = classBlock
      .replace(/\bfont-black\b/g, "__FB__")
      .replace(/\bfont-bold\b/g, "__FSB__")
      .replace(/\bfont-semibold\b/g, "__FM__");
      
    let isTitleSize = /\btext-\[(?:2[0-9]|[3-9][0-9])px\]/.test(classBlock) || /\btext-[2-5]xl\b/.test(classBlock);
    
    if (isTitleSize) {
      modifiedBlock = modifiedBlock
        .replace(/__FB__/g, "font-bold")
        .replace(/__FSB__/g, "font-bold")
        .replace(/__FM__/g, "font-semibold");
    } else {
      modifiedBlock = modifiedBlock
        .replace(/__FB__/g, "font-bold")
        .replace(/__FSB__/g, "font-semibold")
        .replace(/__FM__/g, "font-medium");
    }

    return `className={${modifiedBlock}}`;
  });

  if (content !== modifiedContent) {
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
  }
});

console.log("Done");
