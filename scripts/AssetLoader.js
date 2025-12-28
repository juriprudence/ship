/**
 * AssetLoader handles preloading of various game assets.
 */
export class AssetLoader {
    constructor() {
        this.assets = {
            images: {},
            sounds: {},
            json: {}
        };
        this.totalToLoad = 0;
        this.loadedCount = 0;
        this.onProgress = null; // Callback: (progress) => {}
        this.onComplete = null; // Callback: () => {}
    }

    async loadImages(imageUrls) {
        const promises = imageUrls.map(url => this.loadImage(url));
        return Promise.all(promises);
    }

    loadImage(url) {
        this.totalToLoad++;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.images[url] = img;
                this.updateProgress();
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                this.updateProgress();
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }

    async loadSounds(soundUrls) {
        const promises = soundUrls.map(url => this.loadSound(url));
        return Promise.all(promises);
    }

    loadSound(url) {
        this.totalToLoad++;
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.assets.sounds[url] = audio;
                // Avoid multiple calls to updateProgress for the same audio
                audio.oncanplaythrough = null;
                this.updateProgress();
                resolve(audio);
            };
            audio.onerror = () => {
                console.error(`Failed to load sound: ${url}`);
                this.updateProgress();
                reject(new Error(`Failed to load sound: ${url}`));
            };
            audio.src = url;
            audio.load();
        });
    }

    async loadJSONs(jsonUrls) {
        const promises = jsonUrls.map(url => this.loadJSON(url));
        return Promise.all(promises);
    }

    async loadJSON(url) {
        this.totalToLoad++;
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.assets.json[url] = data;
            this.updateProgress();
            return data;
        } catch (error) {
            console.error(`Failed to load JSON: ${url}`, error);
            this.updateProgress();
            throw error;
        }
    }

    updateProgress() {
        this.loadedCount++;
        const progress = this.totalToLoad > 0 ? (this.loadedCount / this.totalToLoad) : 1;
        if (this.onProgress) {
            this.onProgress(progress);
        }
        if (this.loadedCount === this.totalToLoad && this.onComplete) {
            this.onComplete();
        }
    }

    getAsset(type, url) {
        return this.assets[type][url];
    }
}
