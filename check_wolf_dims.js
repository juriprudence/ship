const fs = require('fs');

function getDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    return { width, height };
}

console.log('Wolf 1:', getDimensions('d:/xml/kharof/images/wolf1.png'));
console.log('Wolf 2:', getDimensions('d:/xml/kharof/images/wolf2.png'));
