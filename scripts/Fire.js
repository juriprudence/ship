export class Fire {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.embers = [];
        this.timer = 0;
        this.radius = 80; // Repel radius
        this.flickerBase = 18;
        this.flicker = 0;
        this.lifeTime = 120; // 2 minutes
        this.intensity = 1.0; // Fire intensity for aging effect
        this.heatWaveTimer = 0;
    }

    update(dt) {
        this.lifeTime -= dt;

        // Fire intensity decreases over time (burns out slowly)
        this.intensity = Math.max(0.3, this.lifeTime / 120);

        // Flicker effect for glow (more dynamic)
        this.timer += dt * 8;
        this.flicker = Math.sin(this.timer) * 3 + Math.cos(this.timer * 1.7) * 1.5;

        // Heat wave distortion timer
        this.heatWaveTimer += dt * 5;

        // Spawn new particles based on intensity
        const maxParticles = Math.floor(80 * this.intensity);
        if (this.particles.length < maxParticles) {
            // More fire particles when burning strong
            const fireCount = Math.floor(3 * this.intensity);
            for (let i = 0; i < fireCount; i++) {
                this.particles.push(this.createParticle('fire'));
            }
        }

        // Smoke particles (more when dying out)
        const smokeChance = 0.15 + (1 - this.intensity) * 0.2;
        if (Math.random() < smokeChance) {
            this.particles.push(this.createParticle('smoke'));
        }

        // Spawn embers occasionally
        if (Math.random() < 0.08 * this.intensity) {
            this.embers.push(this.createEmber());
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'smoke') {
                p.y -= p.speed * dt * 25;
                p.x += Math.sin(p.life * 4 + p.offset) * 0.8; // More drift
                p.life -= dt * 0.4;
                p.size += dt * 18;
                p.opacity = Math.max(0, p.life * 0.25);
            } else {
                // Fire logic - more realistic flickering movement
                p.y -= p.speed * dt * (50 + Math.sin(this.timer + p.offset) * 15);
                p.x += Math.sin(p.life * 12 + p.offset) * 0.4 + Math.cos(this.timer * 2) * 0.2;
                p.life -= dt * 1.3;
                p.size = Math.max(1, p.baseSize * (p.life / p.maxLife) * (0.8 + Math.sin(this.timer * 3 + p.offset) * 0.2));
                p.opacity = Math.min(1, p.life * 2);
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update embers
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.y -= e.vy * dt * 30;
            e.x += e.vx * dt * 30;
            e.vy -= dt * 20; // Gravity
            e.vx *= (1 - dt * 0.5); // Air resistance
            e.life -= dt;
            e.brightness = Math.max(0, e.life * 2) * (0.7 + Math.sin(this.timer * 10 + e.offset) * 0.3);

            if (e.life <= 0) {
                this.embers.splice(i, 1);
            }
        }
    }

    createParticle(type) {
        const spread = type === 'smoke' ? 12 : 8;
        const startY = type === 'smoke' ? (this.y - 20) : (this.y + 3);
        const maxLife = type === 'smoke' ? (1.8 + Math.random() * 0.8) : (0.6 + Math.random() * 0.5);

        return {
            x: this.x + (Math.random() - 0.5) * spread,
            y: startY,
            size: type === 'smoke' ? (6 + Math.random() * 6) : (5 + Math.random() * 7),
            baseSize: type === 'smoke' ? (6 + Math.random() * 6) : (5 + Math.random() * 7),
            speed: type === 'smoke' ? (0.6 + Math.random() * 0.8) : (0.8 + Math.random() * 1.8),
            life: maxLife,
            maxLife: maxLife,
            opacity: type === 'smoke' ? 0.3 : 1.0,
            offset: Math.random() * 100,
            type: type,
            hue: type === 'fire' ? (Math.random() * 30) : 0 // Color variation
        };
    }

    createEmber() {
        return {
            x: this.x + (Math.random() - 0.5) * 10,
            y: this.y - 5,
            vx: (Math.random() - 0.5) * 3,
            vy: 3 + Math.random() * 4,
            life: 0.5 + Math.random() * 1.0,
            brightness: 1.0,
            size: 1 + Math.random() * 2,
            offset: Math.random() * 100
        };
    }

    draw(ctx) {
        ctx.save();

        // Separate particles by type for proper layering
        const fireParticles = [];
        const smokeParticles = [];
        this.particles.forEach(p => {
            if (p.type === 'smoke') smokeParticles.push(p);
            else fireParticles.push(p);
        });

        // Draw wood base (charred effect based on burn time)
        const charAmount = 1 - this.intensity;
        const woodColor = this.interpolateColor('#6b4423', '#1a1a1a', charAmount);

        ctx.fillStyle = woodColor;
        ctx.translate(this.x, this.y + 5);

        // Log 1
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-7, -2.5, 14, 5);
        // Add glow on edges if fire is strong
        if (this.intensity > 0.5) {
            ctx.strokeStyle = `rgba(255, 100, 0, ${this.intensity * 0.3})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(-7, -2.5, 14, 5);
        }
        ctx.restore();

        // Log 2
        ctx.save();
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-7, -2.5, 14, 5);
        if (this.intensity > 0.5) {
            ctx.strokeStyle = `rgba(255, 100, 0, ${this.intensity * 0.3})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(-7, -2.5, 14, 5);
        }
        ctx.restore();

        ctx.translate(-this.x, -(this.y + 5));

        // Draw heat wave distortion effect (subtle visual)
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(this.heatWaveTimer + i) * 2;
            ctx.fillStyle = `rgba(255, 150, 50, ${0.05 * this.intensity})`;
            ctx.beginPath();
            ctx.ellipse(this.x + offset, this.y - 20 - i * 10, 15, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 1. Draw Smoke (Behind fire)
        smokeParticles.forEach(p => {
            const alpha = p.opacity;
            // Gradient smoke for more realism
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `rgba(60, 60, 60, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(80, 80, 80, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(100, 100, 100, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Draw Fire Glow (larger, more dynamic)
        ctx.globalCompositeOperation = 'lighter';
        const glowRadius = (this.flickerBase + this.flicker) * this.intensity;
        const gradient = ctx.createRadialGradient(this.x, this.y - 5, 1, this.x, this.y - 5, glowRadius);
        gradient.addColorStop(0, `rgba(255, 220, 100, ${0.9 * this.intensity})`);
        gradient.addColorStop(0.3, `rgba(255, 140, 40, ${0.6 * this.intensity})`);
        gradient.addColorStop(0.6, `rgba(255, 60, 0, ${0.3 * this.intensity})`);
        gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - glowRadius, this.y - 5 - glowRadius, glowRadius * 2, glowRadius * 2);

        // 3. Draw Fire Particles (more vibrant colors)
        fireParticles.forEach(p => {
            let r, g, b, a;

            if (p.life > 0.7) { // Core (Brightest)
                r = 255; g = 240; b = 180; a = p.opacity;
            } else if (p.life > 0.5) { // Hot
                r = 255; g = 200 + p.hue; b = 50; a = p.opacity;
            } else if (p.life > 0.3) { // Medium
                r = 255; g = 120 + p.hue; b = 0; a = p.opacity;
            } else if (p.life > 0.15) { // Cooling
                r = 220; g = 60; b = 0; a = p.opacity * 0.8;
            } else { // Dying
                r = 150; g = 30; b = 30; a = p.opacity * 0.5;
            }

            // Radial gradient for each particle
            const pGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            pGradient.addColorStop(0, `rgba(${r},${g},${b},${a})`);
            pGradient.addColorStop(0.7, `rgba(${r},${Math.floor(g * 0.8)},${Math.floor(b * 0.6)},${a * 0.6})`);
            pGradient.addColorStop(1, `rgba(${r},${Math.floor(g * 0.5)},0,0)`);

            ctx.fillStyle = pGradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Draw Embers
        this.embers.forEach(e => {
            const brightness = e.brightness;
            ctx.fillStyle = `rgba(255, ${Math.floor(150 * brightness)}, 0, ${brightness})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();

            // Ember glow
            if (brightness > 0.5) {
                ctx.fillStyle = `rgba(255, 200, 100, ${brightness * 0.3})`;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 5. Occasional bright sparks
        if (Math.random() < 0.08 * this.intensity) {
            ctx.fillStyle = `rgba(255, 255, 200, ${0.8 * this.intensity})`;
            const sparkX = this.x + (Math.random() - 0.5) * 12;
            const sparkY = this.y - 15 - Math.random() * 25;
            ctx.fillRect(sparkX, sparkY, 1.5, 1.5);

            // Spark trail
            ctx.fillStyle = `rgba(255, 150, 0, ${0.4 * this.intensity})`;
            ctx.fillRect(sparkX, sparkY + 2, 1, 3);
        }

        ctx.restore();
    }

    // Helper function to interpolate between two hex colors
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
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