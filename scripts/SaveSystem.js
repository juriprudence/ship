export class SaveSystem {
    static STORAGE_KEY = 'desertShepherd_save';

    static save(game) {
        const saveData = {
            version: 1,
            timestamp: Date.now(),
            gameState: {
                gold: game.gameState.gold,
                woolCount: game.gameState.woolCount,
                day: game.gameState.day,
                time: game.gameState.time,
                gameActive: game.gameState.gameActive
            },
            player: game.player ? game.player.serialize() : null,
            sheep: game.sheepList.map(s => s.serialize()),
            wolf: game.wolfList.map(w => w.serialize()),
            trought: game.trought ? game.trought.serialize() : null,
            tileMap: game.world && game.world.tileMap ? game.world.tileMap.serialize() : null
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    static load(game) {
        try {
            const saveDataStr = localStorage.getItem(this.STORAGE_KEY);
            if (!saveDataStr) return { success: false, message: 'لا يوجد حفظ سابق' };

            const saveData = JSON.parse(saveDataStr);
            
            // Validate version
            if (!saveData.version) {
                return { success: false, message: 'ملف الحفظ غير صالح' };
            }

            // Restore game state
            if (saveData.gameState && game.gameState) {
                game.gameState.gold = saveData.gameState.gold || 0;
                game.gameState.woolCount = saveData.gameState.woolCount || 0;
                game.gameState.day = saveData.gameState.day || 1;
                game.gameState.time = saveData.gameState.time || 0;
                game.gameState.gameActive = saveData.gameState.gameActive !== false;
            }

            // Restore player
            if (saveData.player && game.player) {
                game.player.deserialize(saveData.player);
            }

            // Restore sheep
            if (saveData.sheep && Array.isArray(saveData.sheep)) {
                // Re-import Sheep class dynamically to avoid circular dependency
                import('./Sheep.js').then(({ Sheep }) => {
                    game.sheepList = saveData.sheep.map(sData => {
                        const sheep = new Sheep(sData.x || 0, sData.y || 0, game.loader);
                        sheep.deserialize(sData);
                        return sheep;
                    });
                });
            }

            // Restore wolves
            if (saveData.wolf && Array.isArray(saveData.wolf)) {
                import('./Wolf.js').then(({ Wolf }) => {
                    game.wolfList = saveData.wolf.map(wData => {
                        const wolf = new Wolf(game.loader);
                        wolf.deserialize(wData);
                        return wolf;
                    });
                });
            }

            // Restore trought
            if (saveData.trought && game.trought) {
                game.trought.deserialize(saveData.trought);
            }

            // Restore tile map
            if (saveData.tileMap && game.world && game.world.tileMap) {
                game.world.tileMap.deserialize(saveData.tileMap);
            }

            game.updateUI();
            return { success: true, message: 'تم تحميل الحفظ بنجاح!' };
        } catch (e) {
            console.error('Failed to load game:', e);
            return { success: false, message: 'فشل في تحميل الحفظ' };
        }
    }

    static hasSave() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== null;
        } catch (e) {
            return false;
        }
    }

    static clearSave() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Failed to clear save:', e);
            return false;
        }
    }
}
