export class TrailCanvas {
    constructor(width = 512, height = 512) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, width, height);

        this.circleRadius = width * 0.2;
        this.fadeAlpha = 0.025;

        // mode: "mouse" or "auto"
        this.mode = "auto";
        this.mousePos = null;

        // auto trail state
        this.autoPos = { x: width / 2, y: height / 2 };
        this.autoVel = { x: 0, y: 0 };
        this.autoSpeed = 3.0;
        this.autoRadius = width * 0.05;

        // mouse position
        window.addEventListener("mousemove", (e) => {
            const margin = 10;
            if (
                e.clientX < margin ||
                e.clientX > window.innerWidth - margin ||
                e.clientY < margin ||
                e.clientY > window.innerHeight - margin
            ) {
                // too close → switch back to auto mode
                this.mode = "auto";
                this.mousePos = null;
            } else {
                this.mode = "mouse";
                this.mousePos = { x: e.clientX, y: e.clientY };
            }
        });

        // if mouse leaves the window → auto mode
        window.addEventListener("mouseleave", () => {
            this.mode = "auto";
            this.mousePos = null;
        });
    }

    update() {
        // fade out
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.fillStyle = `rgba(0,0,0, ${this.fadeAlpha})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.mode === "mouse" && this.mousePos) {
            // draw mouse trail
            this.#drawGradient(this.mousePos.x, this.mousePos.y, this.circleRadius);
        } else {
            // update & draw auto trail
            this.#updateAutoTrail();
            this.#drawGradient(this.autoPos.x, this.autoPos.y, this.autoRadius);
        }
    }

    #updateAutoTrail() {
        this.autoVel.x += (Math.random() - 0.5) * 0.2;
        this.autoVel.y += (Math.random() - 0.5) * 0.2;

        const speed = Math.hypot(this.autoVel.x, this.autoVel.y);
        if (speed > this.autoSpeed) {
            this.autoVel.x = (this.autoVel.x / speed) * this.autoSpeed;
            this.autoVel.y = (this.autoVel.y / speed) * this.autoSpeed;
        }

        this.autoPos.x += this.autoVel.x;
        this.autoPos.y += this.autoVel.y;

        // bounce at edges
        if (this.autoPos.x < 0 || this.autoPos.x > this.canvas.width) this.autoVel.x *= -1;
        if (this.autoPos.y < 0 || this.autoPos.y > this.canvas.height) this.autoVel.y *= -1;
    }

    #drawGradient(x, y, radius) {
        this.ctx.globalCompositeOperation = "lighter";
        const g = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0.0, "rgba(255,255,255,0.9)");
        g.addColorStop(0.2, "rgba(255,255,255,0.4)");
        g.addColorStop(0.5, "rgba(255,255,255,0.15)");
        g.addColorStop(0.8, "rgba(255,255,255,0.05)");
        g.addColorStop(1.0, "rgba(255,255,255,0)");
        this.ctx.fillStyle = g;
        this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        this.ctx.globalCompositeOperation = "source-over";
    }

    getTexture() {
        return this.canvas;
    }

    clear() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
