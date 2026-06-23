import { Vector, ZoneColors } from "../utils.js";
import { Pellet, resolveEnemyClass } from "./entities.js";
import jsyaml from "../../deps/js-yaml/js-yaml.mjs";

export class World {

    static uuid = 0;

    static async create(offset, filepath) {
        const text = await fetch(filepath).then(r => r.text());
        const mapInfo = jsyaml.load(text);
        return new World(offset, mapInfo);
    }

    constructor(offset, mapInfo) {
        this.id = World.uuid;
        World.uuid++;
        // offset in global units to not overlap other worlds
        this.pos = new Vector(offset.x, offset.y);
        this.name = mapInfo.name;
        this.properties = mapInfo.properties;
        this.areas = [];

        const lastAreaDims = { x: 0, y: 0, width: 0, height: 0 };
        for (let i = 0; i < mapInfo.areas.length; i++) {
            const areaObj = new Area(mapInfo.areas[i], i, lastAreaDims, this.properties);
            this.areas.push(areaObj);
            lastAreaDims.x = areaObj.pos.x;
            lastAreaDims.y = areaObj.pos.y;
            lastAreaDims.width = areaObj.size.x;
            lastAreaDims.height = areaObj.size.y;
        }
    }
}

class Area {
    constructor(areaInfo, index, lastAreaDims, worldProps) {
        if (areaInfo.properties) this.properties = areaInfo.properties;
        if (areaInfo.boss) this.boss = areaInfo.boss;
        this.friction = worldProps?.friction ?? 0.75;
        const bgColor = this.properties?.background_color ?? worldProps?.background_color;
        if (bgColor) {
            const [r, g, b, a] = bgColor;
            this.color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        }
        this.id = index;
        this.pos = new Vector(0, 0);
        this.size = new Vector(0, 0);
        this.zones = [];
        this.activeZone = undefined;
        this.enemies = [];
        this.pellets = [];

        // set area coordinates (top left corner, world-local units)
        switch (areaInfo.x) {
            case "var x":       this.pos.x = 0;                                    break;
            case "last_x":      this.pos.x = lastAreaDims.x;                       break;
            case "last_right":  this.pos.x = lastAreaDims.x + lastAreaDims.width;  break;
            default:            this.pos.x = areaInfo.x;
        }
        switch (areaInfo.y) {
            case "var y":       this.pos.y = 0;                                    break;
            case "last_y":      this.pos.y = lastAreaDims.y;                       break;
            case "last_bottom": this.pos.y = lastAreaDims.y + lastAreaDims.height; break;
            default:            this.pos.y = areaInfo.y;
        }

        // create zones
        const lastZoneDims = { x: 0, y: 0, width: 0, height: 0 };
        for (const zoneInfo of areaInfo.zones) {
            const zoneObj = new Zone(zoneInfo, lastZoneDims);
            this.zones.push(zoneObj);
            lastZoneDims.x = zoneObj.pos.x;
            lastZoneDims.y = zoneObj.pos.y;
            lastZoneDims.width = zoneObj.size.x;
            lastZoneDims.height = zoneObj.size.y;
        }

        // set area size by bounding box of zones
        if (this.zones.length !== 0) {
            const boundary = this.zones.reduce((acc, zone) => {
                return {
                    minX: Math.min(acc.minX, zone.pos.x),
                    minY: Math.min(acc.minY, zone.pos.y),
                    maxX: Math.max(acc.maxX, zone.pos.x + zone.size.x),
                    maxY: Math.max(acc.maxY, zone.pos.y + zone.size.y)
                }
            }, {
                minX: Infinity,
                minY: Infinity,
                maxX: -Infinity,
                maxY: -Infinity
            });
            this.size.set(boundary.maxX - boundary.minX, boundary.maxY - boundary.minY);
        }

        // default to first active zone (shouldn't be more than 1)
        this.activeZone = this.zones.find(z => z.type === "ACTIVE");
    }

    load() {
        this.enemies = [];
        this.pellets = [];
        if (!this.activeZone) return;

        // create enemies
        for (const groupData of this.activeZone.spawner) {
            // usually only one type per group, though the yaml files declare it as an array
            for (let i = 0; i < groupData.types.length; i++) {
                const enemyType = groupData.types[i];
                const EnemyClass = resolveEnemyClass(enemyType);

                // just pass whatever data is in there, let the enemy class deal with specifics
                const config = { ...groupData };
                delete config.types;
                config.type = enemyType;
                config.zonePos = this.activeZone.pos;
                config.zoneSize = this.activeZone.size;
                for (let index = 0; index < groupData.count; index++) {
                    config.index = index;
                    this.enemies.push(EnemyClass.create(config));
                }
            }
        }

        // create pellets
        for (let i = 0; i < 25; i++) {
            this.pellets.push(new Pellet(this.activeZone.pos, this.activeZone.size));
        }
    }

    unload() {
        // game should completely own player membership across areas
        this.enemies = [];
        this.pellets = [];
    }

    reset(players) {
        const spawn = this.getSpawnPoint();
        for (const p of players) {
            p.reset(spawn.x, spawn.y);
        }
        for (const enemy of this.enemies) {
            enemy.reset();
        }
        for (const pellet of this.pellets) {
            pellet.reset();
        }
    }

    getSpawnPoint() {
        // default to first safe zone
        const safeZone = this.zones.find(z => z.type === "SAFE" || z.type === "VICTORY");
        if (!safeZone) {
            throw new Error("unable to find area spawn point");
        }
        return new Vector(
            safeZone.pos.x + (safeZone.size.x / 2),
            safeZone.pos.y + (safeZone.size.y / 2)
        );
    }

    update(dt, players) {
        // clear temp effects first
        for (const player of players) {
            player.clearTempEffects();
        }
        // move enemies and apply aura effects
        for (const enemy of this.enemies) {
            enemy.move(dt);
            enemy.applyAreaCollision(this.activeZone.pos, this.activeZone.size);
            enemy.applyAura(players);
        }
        // handle player logic
        const transitions = [];
        for (const player of players) {
            if (player.isActive()) {
                player.move(dt, this.friction);
                player.applyAreaCollision(this.size);
                player.applyEnemyCollision(this.enemies);
                player.applyPelletCollision(this.pellets);
                const tp = player.checkTeleport(this);
                if (tp) {
                    transitions.push(tp);
                }
            } else if (player.isDowned()) {
                player.updateDownedState(dt, players);
            }
            //player.updateTimedEffects(dt);
        }
        return transitions;
    }

}

class Zone {
    constructor(zoneInfo, lastZoneDims) {
        this.type = zoneInfo.type.toUpperCase();
        if (!(this.type in ZoneColors)) {
            throw new Error(`undefined zone type: ${this.type}`);
        }
        if (zoneInfo.translate) this.translate = zoneInfo.translate;
        if (zoneInfo.spawner) this.spawner = zoneInfo.spawner;
        this.pos = new Vector(0, 0);
        this.size = new Vector(0, 0);

        // set zone coordinates (top left corner, area-local units)
        switch (zoneInfo.x) {
            case "var x":       this.pos.x = 0;                                    break;
            case "last_x":      this.pos.x = lastZoneDims.x;                       break;
            case "last_right":  this.pos.x = lastZoneDims.x + lastZoneDims.width;  break;
            default:            this.pos.x = zoneInfo.x;
        }
        switch (zoneInfo.y) {
            case "var y":       this.pos.y = 0;                                    break;
            case "last_y":      this.pos.y = lastZoneDims.y;                       break;
            case "last_bottom": this.pos.y = lastZoneDims.y + lastZoneDims.height; break;
            default:            this.pos.y = zoneInfo.y;
        }

        // set zone size
        switch (zoneInfo.width) {
            case "last_width":  this.size.x = lastZoneDims.width;  break;
            default:            this.size.x = zoneInfo.width;
        }
        switch (zoneInfo.height) {
            case "last_height": this.size.y = lastZoneDims.height; break;
            default:            this.size.y = zoneInfo.height;
        }
    }
}
