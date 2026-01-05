import { Vector } from "./utils.js";
import { EntityType } from "./entities.js";

export const settings = {
    TPS: 60,
    inputDelay: 0,
    slowdown: 3,
    followPlayer: true,
    paused: false,
    showGrid: false,
    tasOn: false,
    drawBlock: false,
    drawPath: true,
    drawVo: true
};
settings.SPT = 1 / settings.TPS;        // seconds per tick
settings.MSPT = 1000 / settings.TPS;    // milliseconds per tick

export const areaData = {
    x: 0,
    y: 155,
    cols: 150,
    rows: 50,
    nodeSize: 14,
    safeTileWidth: 8
};

export const playerData = {
    spawn: new Vector(
        areaData.nodeSize * areaData.safeTileWidth / 2 + areaData.x,
        areaData.rows * areaData.nodeSize / 2 + areaData.y),
    radius: 22,
    speed: 800
};

export const enemyData = [
    {
        type: EntityType.NORMAL,
        count: 20,
        radius: 50,
        speed: 100
    },
    {
        type: EntityType.SLOWING,
        count: 0,
        radius: 20,
        speed: 120,
        auraRadius: 160
    },
    {
        type: EntityType.WALL,
        count: 10,
        radius: 30,
        speed: 120,
        clockwise: true
    },
    {
        type: EntityType.WALL,
        count: 2,
        radius: 30,
        speed: 120,
        clockwise: false
    }
];
