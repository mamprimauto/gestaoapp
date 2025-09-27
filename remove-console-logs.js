#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Padrões para encontrar e remover
const patterns = [
  /^\s*console\.(log|error|warn|debug|info|trace|dir|table|time|timeEnd|timeLog|assert|count|countReset|group|groupEnd|groupCollapsed)\([\s\S]*?\);?\s*$/gm,
  /^\s*console\.(log|error|warn|debug|info|trace|dir|table|time|timeEnd|timeLog|assert|count|countReset|group|groupEnd|groupCollapsed)\([\s\S]*?\)\s*$/gm,
  // Multiline console statements
  /^\s*console\.(log|error|warn|debug|info|trace|dir|table|time|timeEnd|timeLog|assert|count|countReset|group|groupEnd|groupCollapsed)\([^)]*\n[^)]*\);?\s*$/gm,
];

// Encontrar todos os arquivos TypeScript e TSX
const files = [
  ...glob.sync('**/*.ts', { 
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
    cwd: __dirname 
  }),
  ...glob.sync('**/*.tsx', { 
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
    cwd: __dirname 
  })
];

let totalRemoved = 0;
let filesModified = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileRemovedCount = 0;
  
  // Remover console statements
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      fileRemovedCount += matches.length;
      content = content.replace(pattern, '');
    }
  });
  
  // Remover linhas vazias extras que podem ter ficado
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: Removed ${fileRemovedCount} console statements`);
    totalRemoved += fileRemovedCount;
    filesModified++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total console statements removed: ${totalRemoved}`);