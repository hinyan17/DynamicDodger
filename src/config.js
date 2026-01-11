import { Vector } from "./utils.js";
import { EnemyType } from "./entities.js";

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
        showTint: true,
        showGrid: false,
        showFill: true,
        showOutline: true,
        showExtras: true,
        showPellets: true,
        showBlock: false,
        showPath: true,
        showVo: true
    }
});

//standard width height: 3200 480 (100x15)
//2100 700
export const areaData = Object.freeze({
    bg_tint: "rgba(57, 13, 57, 0.5)",
    pelletCount: 25,
    x: 0,
    y: 155,
    cols: 100,
    rows: 15,
    nodeSize: 32,
    safeTileWidth: 10
});

export const playerData = Object.freeze({
    name: "B0YqL",
    color: "#FF0000",//"#1E90FF"
    hatSrc: "./assets/summer-olympics-2-wreath.png",
    gemSrc: "./assets/7500-gem.png",
    radius: 15,
    speed: 510,
    spawn: new Vector(
        areaData.nodeSize * areaData.safeTileWidth / 2 + areaData.x,
        areaData.rows * areaData.nodeSize / 2 + areaData.y)
});

/*
export const enemyData = [
    {
        type: EnemyType.NORMAL,
        count: 0,
        radius: 24,
        speed: 100
    },
    {
        type: EnemyType.SLOWING,
        count: 0,
        radius: 20,
        speed: 120,
        auraRadius: 160
    },
    {
        type: EnemyType.WALL,
        count: 10,
        radius: 30,
        speed: 120,
        clockwise: true
    },
    {
        type: EnemyType.WALL,
        count: 3,
        radius: 30,
        speed: 120,
        clockwise: false
    }
];
*/
///*
//20
export const enemyData = [
    {
        type: EnemyType.IMMUNE,
        count: 75,
        radius: 18,
        speed: 480
    },
    {
        type: EnemyType.WITHERING,
        count: 7,
        radius: 12,
        speed: 60,
        auraRadius: 100
    },
    {
        type: EnemyType.WALL,
        count: 6,
        radius: 30,
        speed: 900,
        clockwise: true
    },
    {
        type: EnemyType.WALL,
        count: 6,
        radius: 30,
        speed: 900,
        clockwise: false
    }
];
//*/
