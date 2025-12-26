
const fs = require('fs');
function getDimensions(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }
    const buffer = fs.readFileSync(filePath);
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    return { width, height };
}
console.log('Desert:', getDimensions('d:/xml/kharof/images/desert.png'));
