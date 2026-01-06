import { Vector } from "./utils.js";

export default class InputManager {
    constructor(canvas, delay) {
        this.canvas = canvas;
        this.delay = delay;
        this.keys = {up: false, down: false, left: false, right: false};
        this.mousePos = new Vector(0, 0);
        this.mouseActive = false;
        this.inputBuffer = [];
        
        this.handleKey = this.handleKey.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouse = this.handleMouse.bind(this);
        this.initListeners();
    }

    initListeners() {
        window.addEventListener("keydown", this.handleKey);
        window.addEventListener("keyup", this.handleKey);
        window.addEventListener("mousedown", this.handleClick);
        window.addEventListener("mousemove", this.handleMouse);
    }

    handleKey(e) {
        const isPressed = e.type === "keydown";
        switch (e.code) {
            case "KeyW": case "ArrowUp":    this.keys.up = isPressed; break;
            case "KeyS": case "ArrowDown":  this.keys.down = isPressed; break;
            case "KeyA": case "ArrowLeft":  this.keys.left = isPressed; break;
            case "KeyD": case "ArrowRight": this.keys.right = isPressed; break;
        }
    }

    handleClick(e) {
        if (e.target.closest("button")) return;
        this.mouseActive = !this.mouseActive;
    }

    handleMouse(e) {
        // not a good idea to pass the entire canvas and calculate every frame, but that can be dealt with later
        // get the visual bounding box of the canvas in exact screen coordinates
        const rect = this.canvas.getBoundingClientRect();

        // calculate the scaling ratio (game pixels / screen pixels)
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // calculate position relative to the canvas top left
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        // center the coordinates (game uses 0,0 as center). subtract half of the internal resolution
        this.mousePos.x = canvasX - (this.canvas.width / 2);
        this.mousePos.y = canvasY - (this.canvas.height / 2);
    }

    setDelay(delay) {
        this.delay = delay;
    }

    getInput() {
        const now = performance.now();
        const snapshot = {
            keys: { ...this.keys },
            mousePos: new Vector(this.mousePos.x, this.mousePos.y),
            mouseActive: this.mouseActive
        };

        // push new input
        this.inputBuffer.push({ data: snapshot, time: now });

        // find the NEWEST frame that satisfies the delay requirement
        let bestIndex = -1;
        for (let i = 0; i < this.inputBuffer.length; i++) {
            const packet = this.inputBuffer[i];

            // check if this packet has waited long enough
            if (now >= packet.time + this.delay) {
                bestIndex = i;
            } else {
                // this packet is too new, stop searching
                break;
            }
        }

        // clean up the buffer debt
        if (bestIndex !== -1) {
            // bestIndex is the input that is closest to the desired delay
            // everything before it (0 to bestIndex-1) is excess lag which must be deleted
            const validData = this.inputBuffer[bestIndex].data;
            this.inputBuffer.splice(0, bestIndex + 1);

            this.lastProcessedInput = validData;
            return validData;
        }

        // persistence (if buffer is empty/waiting)
        if (this.lastProcessedInput) {
            return this.lastProcessedInput;
        }
        return null;
    }

    processInput(rawInput) {
        if (rawInput === null) return null;

        const keyVec = new Vector(0, 0);
        if (rawInput.keys.left) keyVec.x -= 1;
        if (rawInput.keys.right) keyVec.x += 1;
        if (rawInput.keys.up) keyVec.y -= 1;
        if (rawInput.keys.down) keyVec.y += 1;
        if (keyVec.x !== 0 || keyVec.y !== 0) {
            return keyVec;
        }

        if (rawInput.mouseActive) {
            const intentVec = new Vector(rawInput.mousePos.x, rawInput.mousePos.y);
            const mag = intentVec.magnitude();
            const power = Math.min(mag / 150, 1);
            if (mag !== 0) {
                intentVec.scale(power / mag);
            }
            return intentVec;
        }
        return null;
    }
}
