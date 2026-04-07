const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;
  content = content.replace(/\bfont-serif\b/g, '');
  content = content.replace(/\bfont-mono\b/g, '');
  content = content.replace(/\bfont-montserrat\b/g, '');
  content = content.replace(/\bfont-bold\b/g, 'font-medium');
  content = content.replace(/\bfont-light\b/g, '');
  content = content.replace(/className=\"\s+/g, 'className=\"');
  content = content.replace(/\s+\"/g, '\"');
  // cleanup multiple spaces inside classNames
  content = content.replace(/  +/g, ' ');

  if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
