import { Vector } from "./utils.js";

export const CONSTS = Object.freeze({
    GAME_WIDTH: 1920,
    GAME_HEIGHT: 1080,
    SCALE_FACTOR: 1.5
});

const TPS = 60;
const SPT = 1 / TPS;        // seconds per tick
const MSPT = 1000 / TPS;    // milliseconds per tick
export const settings = Object.freeze({
    TPS, SPT, MSPT,
    inputDelay: 0,
    slowdown: 3,
    followPlayer: true,
    paused: false,
    tasOn: false,
    drawing: {
        grid: false,
        fill: true,
        outline: true,
        extras: true,
        pellets: true,
        block: false,
        path: true,
        vo: true
    }
});

// refactor into separate client / server config later


export const myPlayerData = Object.freeze({
    name: "B0YqL",
    color: "#FF0000",//"#1E90FF"
    hatSrc: "../assets/summer-olympics-2-wreath.png",
    gemSrc: "../assets/7500-gem.png",
    radius: 15,
    speed: 510
});
