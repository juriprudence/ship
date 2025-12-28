export class Trought {
    constructor(rangeMultiplier = 1, assets) {
        // Using a ring-based spawn to ensure it's not too close to the center
        // The minimum and maximum distance both scale with the range multiplier
        const minDistance = 300 * rangeMultiplier;
        const maxDistance = 800 * rangeMultiplier;

        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);

        this.x = Math.cos(angle) * distance;
        this.y = Math.sin(angle) * distance;

        this.isTransformed = false;
        this.timer = 30; // 30 seconds of life once active
        this.maxUsers = 30;
        this.currentUsers = 0;
        this.isExpired = false;

        if (assets) {
            this.imgNormal = assets.getAsset('images', 'images/trought/troughtdis.png');
            this.imgTransformed = assets.getAsset('images', 'images/trought/trought.png');
        } else {
            this.imgNormal = new Image();
            this.imgNormal.src = 'images/trought/troughtdis.png';

            this.imgTransformed = new Image();
            this.imgTransformed.src = 'images/trought/trought.png';
        }

        this.width = 100; // Fallback size
        this.height = 100;
    }

    update(dt) {
        if (this.isTransformed && !this.isExpired) {
            // Drains faster if more sheep are using it
            // With 30 sheep, it should finish in 10 seconds (3x speed).
            // Formula: 1 + (currentUsers / 15) => at 30 users, rate is 1 + 2 = 3.
            const drainRate = 1 + (this.currentUsers / 15);
            this.timer -= dt * drainRate;

            if (this.timer <= 0) {
                this.isExpired = true;
                this.currentUsers = 0; // Clear all users
            }
        }
    }

    reserveSlot() {
        if (this.isTransformed && !this.isExpired && this.currentUsers < this.maxUsers) {
            this.currentUsers++;
            return true;
        }
        return false;
    }

    releaseSlot() {
        if (this.currentUsers > 0) this.currentUsers--;
    }

    draw(ctx) {
        if (this.isExpired) return;
        const img = this.isTransformed ? this.imgTransformed : this.imgNormal;
        if (img.complete && img.naturalWidth > 0) {
            this.width = img.naturalWidth * 0.25;
            this.height = img.naturalHeight * 0.25;
            // Draw centered
            ctx.drawImage(img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }

    checkBounds(x, y) {
        // Only check if not already transformed
        if (this.isTransformed) return false;

        return (x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
            y > this.y - this.height / 2 && y < this.y + this.height / 2);
    }
}
