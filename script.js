"use strict";
console.clear();
const log = console.log.bind(console);
const TAU = Math.PI * 2;
//
// PARTICLE
// ===========================================================================
class Particle {
    constructor(texture, frame) {
        this.texture = texture;
        this.frame = frame;
        this.alive = false;
        this.width = frame.width;
        this.height = frame.height;
        this.originX = frame.width / 2;
        this.originY = frame.height / 2;
    }
    init(x = 0, y = 0) {
        const angle = random(TAU);
        const force = random(2, 6);
        this.x = x;
        this.y = y;
        this.alpha = 1;
        this.alive = true;
        this.theta = angle;
        this.vx = Math.sin(angle) * force;
        this.vy = Math.cos(angle) * force;
        this.rotation = Math.atan2(this.vy, this.vx);
        this.drag = random(0.82, 0.97);
        this.scale = random(0.1, 1);
        this.wander = random(0.5, 1.0);
        this.matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
        return this;
    }
    update() {
        const matrix = this.matrix;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.theta += random(-0.5, 0.5) * this.wander;
        this.vx += Math.sin(this.theta) * 0.1;
        this.vy += Math.cos(this.theta) * 0.1;
        this.rotation = Math.atan2(this.vy, this.vx);
        this.alpha *= 0.98;
        this.scale *= 0.985;
        this.alive = this.scale > 0.06 && this.alpha > 0.06;
        const cos = Math.cos(this.rotation) * this.scale;
        const sin = Math.sin(this.rotation) * this.scale;
        matrix.a = cos;
        matrix.b = sin;
        matrix.c = -sin;
        matrix.d = cos;
        matrix.tx = this.x - ((this.originX * matrix.a) + (this.originY * matrix.c));
        matrix.ty = this.y - ((this.originX * matrix.b) + (this.originY * matrix.d));
        return this;
    }
    draw(context) {
        const m = this.matrix;
        const f = this.frame;
        context.globalAlpha = this.alpha;
        context.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
        context.drawImage(this.texture, f.x, f.y, f.width, f.height, 0, 0, this.width, this.height);
        return this;
    }
}
//
// APP
// ===========================================================================
class App {
    constructor(options) {
        this.pool = [];
        this.particles = [];
        this.pointer = {
            x: -9999,
            y: -9999
        };
        this.buffer = document.createElement("canvas");
        this.bufferContext = this.buffer.getContext("2d");
        this.supportsFilters = (typeof this.bufferContext.filter !== "undefined");
        this.pointerMove = event => {
            event.preventDefault();
            const pointer = event.targetTouches ? event.targetTouches[0] : event;
            this.pointer.x = pointer.clientX;
            this.pointer.y = pointer.clientY;
            for (let i = 0; i < random(2, 7); i++) {
                this.spawn(this.pointer.x, this.pointer.y);
            }
        };
        this.resize = event => {
            this.width = this.buffer.width = this.view.width = window.innerWidth;
            this.height = this.buffer.height = this.view.height = window.innerHeight;
        };
        this.render = time => {
            const context = this.context;
            const particles = this.particles;
            const bufferContext = this.bufferContext;
            context.fillStyle = this.backgroundColor;
            context.fillRect(0, 0, this.width, this.height);
            bufferContext.globalAlpha = 1;
            bufferContext.setTransform(1, 0, 0, 1, 0, 0);
            bufferContext.clearRect(0, 0, this.width, this.height);
            bufferContext.globalCompositeOperation = this.blendMode;
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (particle.alive) {
                    particle.update();
                }
                else {
                    this.pool.push(particle);
                    removeItems(particles, i, 1);
                }
            }
            for (let particle of particles) {
                particle.draw(bufferContext);
            }
            if (this.supportsFilters) {
                if (this.useBlurFilter) {
                    context.filter = `blur(${this.filterBlur}px)`;
                }
                context.drawImage(this.buffer, 0, 0);
                if (this.useContrastFilter) {
                    context.filter = `drop-shadow(4px 4px 4px rgba(0,0,0,1)) contrast(${this.filterContrast}%)`;
                }
            }
            context.drawImage(this.buffer, 0, 0);
            context.filter = "none";
            quickSettings.setValue("Particles", `
      Active = ${this.particles.length}<br>
      Cached = ${this.pool.length}`);
            requestAnimationFrame(this.render);
        };
        Object.assign(this, options);
        this.context = this.view.getContext("2d", { alpha: false });
    }
    spawn(x, y) {
        let particle;
        if (this.particles.length > this.maxParticles) {
            particle = this.particles.shift();
        }
        else if (this.pool.length) {
            particle = this.pool.pop();
        }
        else {
            particle = new Particle(this.texture, sample(this.frames));
        }
        particle.init(x, y);
        this.particles.push(particle);
        return this;
    }
    start() {
        this.resize();
        this.render();
        this.view.style.visibility = "visible";
        if (window.PointerEvent) {
            window.addEventListener("pointermove", this.pointerMove);
        }
        else {
            window.addEventListener("mousemove", this.pointerMove);
            window.addEventListener("touchmove", this.pointerMove);
        }
        window.addEventListener("resize", this.resize);
        requestAnimationFrame(this.render);
        return this;
    }
}
//
// CREATE FRAMES
// ===========================================================================
function createFrames(numFrames, width, height) {
    const frames = [];
    for (let i = 0; i < numFrames; i++) {
        frames.push({
            x: width * i,
            y: 0,
            width: width,
            height: height
        });
    }
    return frames;
}
//
// REMOVE ITEMS
// ===========================================================================
function removeItems(array, startIndex, removeCount) {
    const length = array.length;
    if (startIndex >= length || removeCount === 0) {
        return;
    }
    removeCount = (startIndex + removeCount > length ? length - startIndex : removeCount);
    const len = length - removeCount;
    for (let i = startIndex; i < len; ++i) {
        array[i] = array[i + removeCount];
    }
    array.length = len;
}
//
// RANDOM
// ===========================================================================
function random(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    if (min > max) {
        var tmp = min;
        min = max;
        max = tmp;
    }
    return min + (max - min) * Math.random();
}
function sample(array) {
    return array[(Math.random() * array.length) | 0];
}
//
// QUICK SETTINGS
// ===========================================================================
const app = new App({
    view: document.querySelector("#view"),
    texture: document.querySelector("#star-texture"),
    frames: createFrames(5, 80, 80),
    maxParticles: 2000,
    backgroundColor: "#111111",
    blendMode: "lighter",
    filterBlur: 50,
    filterContrast: 300,
    useBlurFilter: true,
    useContrastFilter: true
});
const blendModes = [
    { label: "Source Over", value: "source-over" },
    { label: "Source In", value: "source-in" },
    { label: "Source Out", value: "source-out" },
    { label: "Source Atop", value: "source-atop" },
    { label: "Destination Over", value: "destination-over" },
    { label: "Destination In", value: "destination-in" },
    { label: "Destination Out", value: "destination-out" },
    { label: "Destination Atop", value: "destination-atop" },
    { label: "Lighter", value: "lighter" },
    { label: "Copy", value: "copy" },
    { label: "Xor", value: "xor" },
    { label: "Multiply", value: "multiply" },
    { label: "Screen", value: "screen" },
    { label: "Overlay", value: "overlay" },
    { label: "Darken", value: "darken" },
    { label: "Lighten", value: "lighten" },
    { label: "Color Dodge", value: "color-dodge" },
    { label: "Color Burn", value: "color-burn" },
    { label: "Hard Light", value: "hard-light" },
    { label: "Soft Light", value: "soft-light" },
    { label: "Difference", value: "difference" },
    { label: "Exclusion", value: "exclusion" },
    { label: "Hue", value: "hue" },
    { label: "Saturation", value: "saturation" },
    { label: "Color", value: "color" },
    { label: "Luminosity", value: "luminosity" },
];
const blendModeNames = blendModes.map(blendMode => blendMode.label);
const blendModeIndex = blendModes.findIndex(blendMode => blendMode.value === app.blendMode);
const container = document.querySelector("#quick-settings");
const quickSettings = QuickSettings.create(0, 0, "Settings", container)
    .addHTML("Support", `Supports Filters: ${app.supportsFilters}`)
    .hideTitle("Support")
    .addHTML("Particles", "")
    .addBoolean("Blur Filter", app.useBlurFilter, value => {
    app.useBlurFilter = value;
    if (value) {
        quickSettings.showControl("Blur Radius");
    }
    else {
        quickSettings.hideControl("Blur Radius");
    }
})
    .addRange("Blur Radius", 0, 200, app.filterBlur, 1, value => app.filterBlur = value)
    .addBoolean("Contrast Filter", app.useContrastFilter, value => {
    app.useContrastFilter = value;
    if (value) {
        quickSettings.showControl("Contrast");
    }
    else {
        quickSettings.hideControl("Contrast");
    }
})
    .addRange("Contrast", 0, 400, app.filterContrast, 1, value => app.filterContrast = value)
    .addDropDown("Blend Mode", blendModeNames, item => app.blendMode = blendModes[item.index].value)
    .addColor("Background", app.backgroundColor, color => app.backgroundColor = color)
    .setValue("Blend Mode", blendModeIndex || 0);
window.addEventListener("load", app.start());
window.focus();
log("APP", app);