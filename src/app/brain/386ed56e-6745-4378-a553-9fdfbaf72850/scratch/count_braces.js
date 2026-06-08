
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\mohit\\OneDrive\\Desktop\\computer\\src\\components\\atc\\StudentManager.tsx', 'utf8');

const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div/g) || []).length;
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

console.log(`Braces: ${openBraces} / ${closeBraces}`);
console.log(`Divs: ${openDivs} / ${closeDivs}`);
console.log(`Parens: ${openParens} / ${closeParens}`);
