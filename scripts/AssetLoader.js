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
        this.failedAssets = []; // Track which assets failed
        this.onProgress = null; // Callback: (progress) => {}
        this.onComplete = null; // Callback: () => {}
    }

    async loadImages(imageUrls) {
        const promises = imageUrls.map(url => this.loadImage(url));
        return Promise.allSettled(promises);
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
                this.failedAssets.push(url);
                this.updateProgress();
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }

    async loadSounds(soundUrls) {
        const promises = soundUrls.map(url => this.loadSound(url));
        return Promise.allSettled(promises);
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
                this.failedAssets.push(url);
                this.updateProgress();
                reject(new Error(`Failed to load sound: ${url}`));
            };
            audio.src = url;
            audio.load();
        });
    }

    async loadJSONs(jsonUrls) {
        const promises = jsonUrls.map(url => this.loadJSON(url));
        return Promise.allSettled(promises);
    }

    loadJSON(url) {
        this.totalToLoad++;
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';

            xhr.onload = () => {
                // status 0 is often returned for local file access (file://)
                if (xhr.status === 200 || (xhr.status === 0 && xhr.response)) {
                    this.assets.json[url] = xhr.response;
                    this.updateProgress();
                    resolve(xhr.response);
                } else {
                    console.error(`Failed to load JSON: ${url} (Status: ${xhr.status})`);
                    this.failedAssets.push(url);
                    this.updateProgress();
                    reject(new Error(`Failed to load JSON: ${url}`));
                }
            };

            xhr.onerror = () => {
                console.error(`Network error loading JSON: ${url}`);
                this.failedAssets.push(url);
                this.updateProgress();
                reject(new Error(`Network error loading JSON: ${url}`));
            };

            xhr.send();
        });
    }

    updateProgress() {
        this.loadedCount++;
        const progress = this.totalToLoad > 0 ? (this.loadedCount / this.totalToLoad) : 1;
        if (this.onProgress) {
            this.onProgress(progress);
        }
        // Check if all assets (successful or failed) have been processed
        if (this.loadedCount === this.totalToLoad && this.onComplete) {
            // Optionally, pass failed assets count or list to onComplete
            this.onComplete(this.failedAssets.length > 0 ? this.failedAssets : null);
        }
    }

    getAsset(type, url) {
        return this.assets[type][url];
    }
}
