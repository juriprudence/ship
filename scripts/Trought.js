export class Trought {
    constructor() {
        // Spawn close to player for visibility
        this.x = (Math.random() - 0.5) * 400;
        this.y = (Math.random() - 0.5) * 400;

        this.isTransformed = false;
        this.timer = 30; // 30 seconds of life once active
        this.maxUsers = 5;
        this.currentUsers = 0;
        this.isExpired = false;

        this.imgNormal = new Image();
        this.imgNormal.src = 'images/trought/troughtdis.png';

        this.imgTransformed = new Image();
        this.imgTransformed.src = 'images/trought/trought.png';

        this.width = 100; // Fallback size
        this.height = 100;
    }

    update(dt) {
        if (this.isTransformed && !this.isExpired) {
            this.timer -= dt;
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
