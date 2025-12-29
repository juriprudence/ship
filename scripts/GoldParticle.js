export class GoldParticle {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        
        // First target: player position
        this.playerTargetX = targetX;
        this.playerTargetY = targetY;
        
        // Final target: UI gold counter
        this.uiTargetX = window.innerWidth * 0.85; // Approximate gold counter position
        this.uiTargetY = 60;
        
        this.phase = 0; // 0 = flying to player, 1 = flying to UI
        this.life = 0;
        this.maxLife = 1.5; // Seconds to complete
        this.collected = false;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        
        // Visual
        this.scale = 1;
        this.rotation = 0;
        this.bounceCount = 0;
    }
    
    update(dt) {
        this.life += dt;
        
        if (this.phase === 0) {
            // Fly to player with arc
            const progress = Math.min(this.life / 0.6, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            // Arc height
            const arcHeight = 50 * Math.sin(progress * Math.PI);
            
            this.x = this.startX + (this.playerTargetX - this.startX) * easeProgress;
            this.y = this.startY + (this.playerTargetY - this.startY) * easeProgress - arcHeight;
            this.scale = 0.5 + progress * 0.5;
            this.rotation += dt * 5;
            
            if (progress >= 1) {
                this.phase = 1;
                this.collected = true;
            }
        } else {
            // Fly to UI
            const phaseTime = this.life - 0.6;
            const progress = Math.min(phaseTime / 0.5, 1);
            const easeProgress = this.easeInBackOut(progress);
            
            this.x = this.playerTargetX + (this.uiTargetX - this.playerTargetX) * easeProgress;
            this.y = this.playerTargetY + (this.uiTargetY - this.playerTargetY) * easeProgress;
            this.scale = 1 - progress * 0.8;
            this.rotation += dt * 10;
        }
        
        return this.life < this.maxLife;
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    easeInBackOut(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c3) * 2 * t - c1)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c3) * (t * 2 - 3) + c1) + 2) / 2;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // Gold coin glow
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        
        // Draw gold coin emoji
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪙', 0, 0);
        
        ctx.restore();
    }
}

export class GoldBurst {
    constructor(x, y, count = 10) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 0.5 + Math.random() * 0.3,
                size: 8 + Math.random() * 8
            });
        }
    }
    
    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // Gravity
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        return this.particles.length > 0;
    }
    
    draw(ctx) {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
}
