import { Vector } from "./utils.js";
import { EntityType } from "./entities.js";

export const settings = {
    TPS: 60,
    inputDelay: 20,
    paused: false,
    showGrid: false,
    tasOn: false,
    drawBlock: false,
    drawPath: true,
    drawVo: false,
    followPlayer: true
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
    speed: 850
};

export const enemyData = [
    {
        type: EntityType.NORMAL,
        count: 5,
        radius: 20,
        speed: 400
    },
    {
        type: EntityType.SLOWING,
        count: 10,
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
