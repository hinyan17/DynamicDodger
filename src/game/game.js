import { CONSTS } from "../config.js";
import { World } from "./worldModel.js";
import { Player, Pellet } from "./entities.js";
import { Vector, circleInRect, distSqToRect } from "../utils.js";
import { myPlayerData } from "../config.js";

export default class Game {
    constructor() {
        this.worlds = [];
        this.players = new Map();           // playerId, Player
        this.loadedAreas = new Map();       // worldId, set<areaId>
        this.playersByArea = new Map();     // Area, set<Player> (lookup index)
        this.activePlayer = null;
    }

    async init() {
        this.worlds.push(await World.create(new Vector(0, 0), "../../example-map.yaml"));
        this.worlds.push(await World.create(new Vector(0, 500), "../../example-map.yaml"));
        // add more worlds if needed

        this.spawnPlayer(myPlayerData, 0, 0);
        this.spawnPlayer(myPlayerData, 1, 0);
        // todo use a proper join game function

        this.activePlayer = this.players.get(0);
    }

    spawnPlayer(playerData, worldId, areaId) {
        const player = new Player(playerData);
        this.players.set(player.id, player);
        const loc = {worldId, areaId};
        const spawn = this.getArea(loc).getSpawnPoint();
        this.movePlayerToArea(player, loc, spawn);
    }

    removePlayer(player) {
        this.rmFromAreaIndex(player);
        this.unloadArea(player.location);
        this.players.delete(player.id);
        // todo switch activePlayer if needed
    }

    addToAreaIndex(player) {
        const area = this.getArea(player.location);
        const playerSet = this.playersByArea.get(area);
        if (playerSet === undefined) {
            this.playersByArea.set(area, new Set([player]));
        } else {
            playerSet.add(player);
        }
    }

    rmFromAreaIndex(player) {
        const area = this.getArea(player.location);
        const playerSet = this.playersByArea.get(area);
        if (!playerSet) return;
        playerSet.delete(player);
        if (playerSet.size === 0) {
            this.playersByArea.delete(area);
        }
    }

    // if the area isn't already loaded, load it and update loadedAreas
    ensureAreaLoaded(loc) {
        const newArea = this.getArea(loc);
        const newWorldAreaSet = this.loadedAreas.get(loc.worldId);
        if (newWorldAreaSet === undefined) {
            this.loadedAreas.set(loc.worldId, new Set([loc.areaId]));
            newArea.load();
        } else if (!newWorldAreaSet.has(loc.areaId)) {
            newWorldAreaSet.add(loc.areaId);
            newArea.load();
        }
        return newArea;
    }

    // if the area isn't already unloaded and is empty, unload it and update loadedAreas
    unloadArea(loc) {
        const areaSet = this.loadedAreas.get(loc.worldId);
        if (areaSet === undefined || !areaSet.has(loc.areaId)) return;
        const area = this.getArea(loc);
        if (this.playersByArea.get(area) !== undefined) return;

        area.unload();
        areaSet.delete(loc.areaId);
        if (areaSet.size === 0) {
            this.loadedAreas.delete(loc.worldId);
        }
    }

    // helper to handle all the data structures properly
    movePlayerToArea(player, newLoc, newPos) {
        const oldLoc = { ...player.location };
        this.ensureAreaLoaded(newLoc);
        this.rmFromAreaIndex(player);
        player.pos.set(newPos.x, newPos.y);
        player.setLocation(newLoc.worldId, newLoc.areaId);
        this.addToAreaIndex(player);
        // return source location for potential unload
        return oldLoc;
    }

    resolveTransition(t) {
        const { player, adjPos, sameWorldTP, oldArea } = t;
        const currLoc = { ...player.location };
        const currArea = this.getArea(currLoc);

        // validate transition intent (player is where the transition says its from)
        if (currArea !== oldArea) throw new Error("Invalid transition intent");

        // find target area location
        const newLoc = sameWorldTP ?
            this.findClosestArea(currLoc, adjPos, player.radius) :
            this.findClosestWorld(currLoc, adjPos);

        // calculate target area local coordinates
        const oldWorldOffset = this.getWorld(currLoc).pos;
        const oldAreaOffset = currArea.pos;
        const newWorldOffset = this.getWorld(newLoc).pos;
        const newAreaOffset = this.getArea(newLoc).pos;
        const newPos = new Vector(
            oldWorldOffset.x + oldAreaOffset.x + adjPos.x - newWorldOffset.x - newAreaOffset.x,
            oldWorldOffset.y + oldAreaOffset.y + adjPos.y - newWorldOffset.y - newAreaOffset.y
        );
        return this.movePlayerToArea(player, newLoc, newPos);
    }

    // find the first area that contains targetPos near the current area (same world)
    findClosestArea(currLoc, targetPos, radius) {
        // compute the target position in world-local coordinates
        const areas = this.getWorld(currLoc).areas;
        const areaOffset = this.getArea(currLoc).pos;
        const targetWorldPos = new Vector(areaOffset.x + targetPos.x, areaOffset.y + targetPos.y);

        // alternating search using currAreaId as closest index hint
        const newLoc = {worldId: currLoc.worldId, areaId: null};
        let step = 1;
        let left = currLoc.areaId - step;
        let right = currLoc.areaId + step;
        while (0 <= left && right < areas.length) {
            if (circleInRect(targetWorldPos, radius, areas[left].pos, areas[left].size)) {
                newLoc.areaId = left;
                return newLoc;
            } else if (circleInRect(targetWorldPos, radius, areas[right].pos, areas[right].size)) {
                newLoc.areaId = right;
                return newLoc;
            }
            left--;
            right++;
        }
        while (0 <= left) {
            if (circleInRect(targetWorldPos, radius, areas[left].pos, areas[left].size)) {
                newLoc.areaId = left;
                return newLoc;
            }
            left--;
        }
        while (right < areas.length) {
            if (circleInRect(targetWorldPos, radius, areas[right].pos, areas[right].size)) {
                newLoc.areaId = right;
                return newLoc;
            }
            right++;
        }
        throw new Error("findClosestArea() couldn't find valid area");
    }

    // find the first different world with anchor area (index 0) closest to targetPos
    findClosestWorld(currLoc, targetPos) {
        // compute the target position in global coordinates
        const worldOffset = this.getWorld(currLoc).pos;
        const areaOffset = this.getArea(currLoc).pos;
        const targetGlobalPos = new Vector(
            worldOffset.x + areaOffset.x + targetPos.x,
            worldOffset.y + areaOffset.y + targetPos.y
        );
        const anchorGlobalPos = new Vector(Infinity, Infinity);

        let bestWorldId = null;
        let bestDist2 = Infinity;
        for (let w of this.worlds) {
            if (w.id === currLoc.worldId) continue;
            const anchor = w.areas[0];
            anchorGlobalPos.set(w.pos.x + anchor.pos.x, w.pos.y + anchor.pos.y);
            const dist2 = distSqToRect(targetGlobalPos, anchorGlobalPos, anchor.size);
            if (dist2 < bestDist2) {
                bestWorldId = w.id;
                bestDist2 = dist2;
            }
        }

        if (bestWorldId === null) {
            throw new Error("findClosestWorld() couldn't find valid world");
        }
        return {worldId: bestWorldId, areaId: 0};
    }

    update(dt, intentVec) {
        const transitionQueue = [];
        // update all areas first
        for (const [worldId, areaIdSet] of this.loadedAreas) {
            for (const areaId of areaIdSet) {
                const area = this.worlds[worldId].areas[areaId];
                const players = this.playersByArea.get(area) ?? [];
                const transitions = area.update(dt, players, intentVec);
                transitionQueue.push(...transitions);
            }
        }

        // resolve all transitions
        const sourceLocs = [];
        for (const t of transitionQueue) {
            sourceLocs.push(this.resolveTransition(t));
        }
        // unload empty areas left from transitions
        for (const loc of sourceLocs) {
            this.unloadArea(loc);
        }

        // remove dead players (safe to remove while iterating map?)
        for (const p of this.players.values()) {
            if (p.isDead()) {
                this.removePlayer(p);
            }
        }

        // post update stuff
        Pellet.oscillator.update(dt);
    }

    updateCameras() {
        // maybe linear interp to show frames between physics updates for high fps
        for (const p of this.players.values()) {
            const world = this.getWorld(p.location);
            const area = this.getArea(p.location);
            p.camera.x = world.pos.x + area.pos.x + p.pos.x - CONSTS.GAME_WIDTH / 2;
            p.camera.y = world.pos.y + area.pos.y + p.pos.y - CONSTS.GAME_HEIGHT / 2;
        }
    }

    downPlayer() {
        //settings.paused = true;
        //document.getElementById("pauseBtn").textContent = ">>";
    }

    // controllable actions by Engine
    // maybe queue these actions for deterministic ordering relative to physics updates
    resetCurrentArea() {
        const area = this.getArea(this.activePlayer.location);
        const players = this.playersByArea.get(area) ?? [];
        area.reset(players);
    }

    resetActivePlayer() {
        const area = this.getArea(this.activePlayer.location);
        this.activePlayer.reset(area.getSpawnPoint());
    }

    reviveActivePlayer() {
        this.activePlayer.revive();
    }

    jumpAreas(count) {
        if (count === 0) return;
        const currWorld = this.getWorld(this.activePlayer.location);
        const newLoc = { ...this.activePlayer.location };
        newLoc.areaId += count;
        if (newLoc.areaId < 0) {
            newLoc.areaId = 0;
        } else if (newLoc.areaId >= currWorld.areas.length) {
            newLoc.areaId = currWorld.areas.length - 1;
        }
        const newArea = this.getArea(newLoc);
        const oldLoc = this.movePlayerToArea(this.activePlayer, newLoc, newArea.getSpawnPoint());
        this.unloadArea(oldLoc);
    }

    getWorld(loc) {
        return this.worlds[loc.worldId];
    }

    getArea(loc) {
        return this.worlds[loc.worldId].areas[loc.areaId];
    }

}
