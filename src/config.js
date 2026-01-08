import { Vector } from "./utils.js";
import { EnemyType } from "./entities.js";

export const CONSTS = Object.freeze({
    GAME_WIDTH: 1920,
    GAME_HEIGHT: 1080,
    SCALE_FACTOR: 1.5
});

export const settings = {
    TPS: 60,
    inputDelay: 0,
    slowdown: 3,
    followPlayer: true,
    paused: false,
    showGrid: true,
    tasOn: false,
    drawBlock: false,
    drawPath: true,
    drawVo: true
};
settings.SPT = 1 / settings.TPS;        // seconds per tick
settings.MSPT = 1000 / settings.TPS;    // milliseconds per tick


//standard width height: 3200 480 (100x15)
//2100 700
export const areaData = Object.freeze({
    x: 0,
    y: 155,
    cols: 100,
    rows: 15,
    nodeSize: 32,
    safeTileWidth: 10
});

export const playerData = Object.freeze({
    spawn: new Vector(
        areaData.nodeSize * areaData.safeTileWidth / 2 + areaData.x,
        areaData.rows * areaData.nodeSize / 2 + areaData.y),
    radius: 15,
    speed: 510
});

/*
export const enemyData = [
    {
        type: EnemyType.NORMAL,
        count: 30,
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
        count: 2,
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
        type: EnemyType.NORMAL,
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
