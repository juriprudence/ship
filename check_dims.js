
const fs = require('fs');
const path = require('path');

function getDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    // PNG dimensions are at offset 16 (width) and 20 (height)
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    return { width, height };
}

const p1 = getDimensions('d:/xml/kharof/images/newplayer/player1.png');
const p2 = getDimensions('d:/xml/kharof/images/newplayer/player2.png');
const oldP = getDimensions('d:/xml/kharof/images/player.png');

console.log('New Player 1:', p1);
console.log('New Player 2:', p2);
console.log('Old Player:', oldP);

const cis = getDimensions('d:/xml/kharof/images/playercis.png');
console.log('Player Cis:', cis);

const cis2 = getDimensions('d:/xml/kharof/images/playercis2.png');
console.log('Player Cis 2:', cis2);
