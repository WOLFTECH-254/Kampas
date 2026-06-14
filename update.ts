import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Specific blocks
  content = content.replace(/bg-white text-black/g, 'bg-gray-900 text-white');
  
  // Backgrounds
  content = content.replace(/bg-plug-black/g, 'bg-white');
  content = content.replace(/bg-plug-charcoal/g, 'bg-pink-50');
  content = content.replace(/bg-black/g, 'bg-white');
  content = content.replace(/bg-gradient-to-br from-plug-charcoal to-plug-black/g, 'bg-gradient-to-br from-pink-50 to-white');
  content = content.replace(/bg-gradient-to-r from-plug-charcoal to-plug-black/g, 'bg-gradient-to-r from-pink-50 to-white');
  
  // Borders
  content = content.replace(/border-plug-gray/g, 'border-pink-200');
  
  // Text Colors
  content = content.replace(/text-white/g, 'text-gray-900');
  content = content.replace(/text-gray-400/g, 'text-gray-600');
  content = content.replace(/text-gray-300/g, 'text-gray-700');
  
  // Accents
  content = content.replace(/bg-plug-yellow/g, 'bg-pink-500');
  content = content.replace(/text-plug-yellow/g, 'text-pink-600');
  content = content.replace(/border-plug-yellow/g, 'border-pink-500');
  content = content.replace(/bg-plug-amber/g, 'bg-pink-600');
  content = content.replace(/text-plug-amber/g, 'text-pink-700');
  
  // Hover states
  content = content.replace(/hover:bg-plug-gray/g, 'hover:bg-pink-200');
  content = content.replace(/hover:bg-plug-charcoal/g, 'hover:bg-pink-100');
  content = content.replace(/hover:bg-plug-black/g, 'hover:bg-pink-50');
  
  // Fix button styles (yellow -> pink button with text-black should be text-white)
  content = content.replace(/text-black([^>]*bg-pink-500)/g, 'text-white$1');
  content = content.replace(/bg-pink-500([^>]*)text-black/g, 'bg-pink-500$1text-white');
  
  content = content.replace(/rgba\(255,193,7,/g, 'rgba(236,72,153,');
  content = content.replace(/bg-pink-500 text-black/g, 'bg-pink-500 text-white');

  // Add more specific fixes for black/white issues
  // Like `text-white hover:text-plug-yellow` might have been replaced to text-gray-900.
  // Actually text-white already became text-gray-900 which is fine for dark-text-on-light theme
  
  fs.writeFileSync(filePath, content);
}

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

processDirectory('./src');

// Also update index.css
let cssContent = fs.readFileSync('./src/index.css', 'utf8');
cssContent = cssContent.replace('background-color: var(--color-plug-black);', 'background-color: #FFFFFF;');
cssContent = cssContent.replace('color: white;', 'color: #111827;');
fs.writeFileSync('./src/index.css', cssContent);

console.log("Theme updated successfully!");
