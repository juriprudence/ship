export class Fire {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.timer = 0;
        this.radius = 80; // Repel radius
        this.flickerBase = 15;
        this.flicker = 0;
        this.lifeTime = 120; // 2 minutes
    }

    update(dt) {
        this.lifeTime -= dt;

        // Flicker effect for glow
        this.timer += dt * 10;
        this.flicker = Math.sin(this.timer) * 2;

        // Spawn new particles
        // Fire particles
        if (this.particles.length < 60) {
            this.particles.push(this.createParticle('fire'));
            this.particles.push(this.createParticle('fire'));
        }
        // Smoke particles (less frequent)
        if (Math.random() < 0.1) { // Reduced smoke (was 0.3)
            this.particles.push(this.createParticle('smoke'));
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'smoke') {
                p.y -= p.speed * dt * 30; // Smoke rises slower
                p.x += Math.sin(p.life * 5 + p.offset) * 0.5; // Drifts more
                p.life -= dt * 0.5; // Lasts longer
                p.size += dt * 15; // Expands significantly
            } else {
                // Fire logic
                p.y -= p.speed * dt * 60;
                p.x += Math.sin(p.life * 10 + p.offset) * 0.3;
                p.life -= dt * 1.5;
                p.size -= dt * 5;
            }

            if (p.life <= 0 || (p.type === 'fire' && p.size <= 0)) {
                this.particles.splice(i, 1);
            }
        }
    }

    createParticle(type) {
        const spread = type === 'smoke' ? 10 : 6;
        const startY = type === 'smoke' ? (this.y - 15) : (this.y + 5); // Smoke starts higher (top of fire)
        return {
            x: this.x + (Math.random() - 0.5) * spread,
            y: startY,
            size: type === 'smoke' ? (5 + Math.random() * 5) : (4 + Math.random() * 5),
            speed: type === 'smoke' ? (0.5 + Math.random()) : (0.5 + Math.random() * 1.5),
            life: type === 'smoke' ? (1.5 + Math.random()) : (0.5 + Math.random() * 0.4),
            offset: Math.random() * 100,
            type: type
        };
    }

    draw(ctx) {
        ctx.save();

        // Separate particles by type for better blending
        const fireParticles = [];
        const smokeParticles = [];
        this.particles.forEach(p => {
            if (p.type === 'smoke') smokeParticles.push(p);
            else fireParticles.push(p);
        });

        /// Draw wood base (Smaller)
        ctx.fillStyle = '#4a3010'; // Darker wood
        ctx.translate(this.x, this.y + 5);
        // Log 1
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-6, -2, 12, 4);
        ctx.restore();
        // Log 2
        ctx.save();
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-6, -2, 12, 4);
        ctx.restore();
        ctx.translate(-this.x, -(this.y + 5)); // Reset translate

        // 1. Draw Smoke (Behind/Above fire, normal blend)
        ctx.globalCompositeOperation = 'source-over';
        smokeParticles.forEach(p => {
            const alpha = Math.max(0, p.life * 0.3); // Low opacity
            // Dark grey smoke
            ctx.fillStyle = `rgba(50, 50, 50, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Draw Fire Glow
        ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
        const glowRadius = this.flickerBase + this.flicker;
        const gradient = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, glowRadius);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)'); // Bright yellow core
        gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.4)'); // Orange middle
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Red fade
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - glowRadius, this.y - glowRadius, glowRadius * 2, glowRadius * 2);

        // 3. Draw Fire Particles
        fireParticles.forEach(p => {
            // Color based on life/height
            let r, g, b, a;

            if (p.life > 0.6) { // Bottom (Hot)
                r = 255; g = 255; b = 150; a = p.life; // White-ish Yellow
            } else if (p.life > 0.3) { // Middle
                r = 255; g = 100; b = 0; a = p.life; // Orange
            } else { // Top (Cooling)
                r = 200; g = 50; b = 50; a = p.life * 0.5; // Red/Dark
            }

            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // Occasional "Spark"
        if (Math.random() < 0.05) {
            ctx.fillStyle = '#ffffaa';
            ctx.fillRect(this.x + (Math.random() - 0.5) * 10, this.y - 10 - Math.random() * 20, 1, 1);
        }

        ctx.restore();
    }

    serialize() {
        return { x: this.x, y: this.y, lifeTime: this.lifeTime };
    }

    static deserialize(data) {
        const f = new Fire(data.x, data.y);
        f.lifeTime = data.lifeTime || 120;
        return f;
    }
}
