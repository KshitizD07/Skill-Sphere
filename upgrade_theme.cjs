const fs = require('fs');
const path = require('path');

const colorMap = {
  '#0b1326': 'bg-base',
  '#131b2e': 'surface-mid',
  '#171f33': 'surface',
  '#222a3d': 'surface-mid',
  '#2d3449': 'surface-high',
  '#434655': 'outline-var',
  '#8d90a0': 'outline',
  '#c3c6d7': 'text-muted',
  '#dae2fd': 'text-primary',
  '#adc6ff': 'primary',
  '#0f69dc': 'primary-container',
  '#002e6a': 'on-primary',
  '#6bd8cb': 'secondary',
  '#89f5e7': 'secondary-bright',
  '#003732': 'on-secondary',
  '#ffb4ab': 'error',
  '#93000a': 'error-container'
};

const regex = /(bg|text|border|placeholder|from|via|to|shadow|fill|stroke|ring|divide)-\[#([0-9a-fA-F]{6})\](\/[0-9]+)?/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace colors
  content = content.replace(regex, (match, prefix, hex, opacity) => {
    const color = '#' + hex.toLowerCase();
    const mappedColor = colorMap[color];
    if (mappedColor) {
      return `${prefix}-${mappedColor}${opacity || ''}`;
    }
    return match;
  });

  // Specific hardcoded replacements for shadows where colors were literal
  content = content.replace(/shadow-\[#0b1326\]/g, 'shadow-bg-base');
  content = content.replace(/shadow-\[#0f69dc\]/g, 'shadow-primary-container');
  content = content.replace(/shadow-\[#93000a\]/g, 'shadow-error-container');

  // Replace fonts
  content = content.replace(/font-\['Manrope'\]/g, 'font-outfit');
  content = content.replace(/font-\['Space_Grotesk'\]/g, 'font-syne');
  content = content.replace(/font-manrope/g, 'font-outfit');
  content = content.replace(/font-space-grotesk/g, 'font-syne');

  // Replace max-w bounds for fuller screen
  content = content.replace(/max-w-6xl mx-auto/g, 'w-full max-w-[1600px] mx-auto');
  content = content.replace(/max-w-5xl mx-auto/g, 'w-full max-w-[1400px] mx-auto');
  content = content.replace(/max-w-4xl mx-auto/g, 'w-full max-w-[1200px] mx-auto');
  content = content.replace(/max-w-3xl mx-auto/g, 'w-full max-w-[1000px] mx-auto');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'client/src'));
console.log('Done upgrading theme tokens.');
