import { Vector } from "./utils.js";

export default class InputManager {
    constructor() {
        this.keys = {
            up: false, down: false, left: false, right: false
        };
        this.mouseActive = false;
        this.mousePos = new Vector(0, 0);
        
        this.handleKey = this.handleKey.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouse = this.handleMouse.bind(this);
        this.init();
    }

    init() {
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
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;
    }

    handleMouse(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;
    }

    getInput() {

    }
}
