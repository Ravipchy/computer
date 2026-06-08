
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\mohit\\OneDrive\\Desktop\\computer\\src\\components\\atc\\StudentManager.tsx', 'utf8');

const lines = content.split('\n');
let balance = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore self-closing divs
    const openMatches = line.match(/<div(?! [^>]*\/>)/g) || [];
    const closeMatches = line.match(/<\/div/g) || [];
    
    balance += openMatches.length;
    balance -= closeMatches.length;
    
    if (openMatches.length !== closeMatches.length) {
        console.log(`Line ${i + 1}: +${openMatches.length} -${closeMatches.length} | Balance: ${balance} | ${line.trim()}`);
    }
}
