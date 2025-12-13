import { Vector } from "./utils.js";

export default class InputManager {
    constructor() {
        this.keys = {
            up: false, down: false, left: false, right: false
        };
        this.mousePos = new Vector(0, 0);
        this.mouseActive = false;
        
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
            case "KeyW": case "ArrowUp":
                this.keys.up = isPressed;
                break;
            case "KeyS": case "ArrowDown":
                this.keys.down = isPressed;
                break;
            case "KeyA": case "ArrowLeft":
                this.keys.left = isPressed;
                break;
            case "KeyD": case "ArrowRight":
                this.keys.right = isPressed;
                break;
        }
    }

    handleClick(e) {
        this.mouseActive = !this.mouseActive;
    }

    handleMouse(e) {
        this.mousePos.x = e.pageX - window.innerWidth / 2;
        this.mousePos.y = e.pageY - window.innerHeight / 2;
    }

    getInput() {
        return {
            keys: this.keys,
            mousePos: this.mousePos,
            mouseActive: this.mouseActive
        };
    }
}
