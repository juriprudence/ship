
const fs = require('fs');
const path = require('path');

const mapWidth = 100;
const mapHeight = 100;
const tileSize = 16;
const layers = [];

const data = [];

for (let y = 0; y < mapHeight; y++) {
    const row = [];
    for (let x = 0; x < mapWidth; x++) {
        // Simple noise simulation
        const rand = Math.random();
        let tileIndex = 0; // Default sand

        // Some variation
        if (rand > 0.92) tileIndex = 1;
        else if (rand > 0.98) tileIndex = 13; // darker sand or rock?

        // Make an "oasis" area near center
        const dx = x - 50;
        const dy = y - 50;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
            // Maybe water or grass tiles if they existed in current setup, 
            // but we only really have valid indices 0 and 1 confirmed as "sand".
            // Let's stick to sand variation for now to be safe.
            tileIndex = 1;
        }

        row.push(tileIndex);
    }
    data.push(row);
}

const map = {
    width: mapWidth,
    height: mapHeight,
    tileSize: tileSize,
    layers: [
        { name: "ground", data: data }
    ]
};

const outputPath = path.join(__dirname, 'scripts', 'maps', 'level1.json');
fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
console.log(`Map generated at ${outputPath}`);
