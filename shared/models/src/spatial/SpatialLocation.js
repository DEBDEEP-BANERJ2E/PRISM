"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialLocation = exports.SpatialLocationSchema = void 0;
const proj4_1 = __importDefault(require("proj4"));
const zod_1 = require("zod");
const WGS84 = 'EPSG:4326';
const UTM_ZONE_33N = '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs';
const MINE_GRID = '+proj=tmerc +lat_0=0 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
exports.SpatialLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    elevation: zod_1.z.number(),
    utm_x: zod_1.z.number().optional(),
    utm_y: zod_1.z.number().optional(),
    mine_grid_x: zod_1.z.number().optional(),
    mine_grid_y: zod_1.z.number().optional(),
    coordinate_system: zod_1.z.string().optional().default('WGS84'),
    accuracy: zod_1.z.number().positive().optional(),
    timestamp: zod_1.z.date().optional()
});
class SpatialLocation {
    constructor(data) {
        const validated = exports.SpatialLocationSchema.parse(data);
        this.latitude = validated.latitude;
        this.longitude = validated.longitude;
        this.elevation = validated.elevation;
        this.coordinate_system = validated.coordinate_system;
        this.accuracy = validated.accuracy;
        this.timestamp = validated.timestamp;
        if (!validated.utm_x || !validated.utm_y) {
            const utmCoords = this.toUTM();
            this.utm_x = validated.utm_x || utmCoords.x;
            this.utm_y = validated.utm_y || utmCoords.y;
        }
        else {
            this.utm_x = validated.utm_x;
            this.utm_y = validated.utm_y;
        }
        if (!validated.mine_grid_x || !validated.mine_grid_y) {
            const mineCoords = this.toMineGrid();
            this.mine_grid_x = validated.mine_grid_x || mineCoords.x;
            this.mine_grid_y = validated.mine_grid_y || mineCoords.y;
        }
        else {
            this.mine_grid_x = validated.mine_grid_x;
            this.mine_grid_y = validated.mine_grid_y;
        }
    }
    toUTM() {
        const utmCoords = (0, proj4_1.default)(WGS84, UTM_ZONE_33N, [this.longitude, this.latitude]);
        return {
            x: utmCoords[0],
            y: utmCoords[1],
            zone: '33N'
        };
    }
    toMineGrid() {
        const mineCoords = (0, proj4_1.default)(WGS84, MINE_GRID, [this.longitude, this.latitude]);
        return {
            x: mineCoords[0],
            y: mineCoords[1]
        };
    }
    distanceTo(other) {
        const R = 6371000;
        const lat1Rad = this.latitude * Math.PI / 180;
        const lat2Rad = other.latitude * Math.PI / 180;
        const deltaLatRad = (other.latitude - this.latitude) * Math.PI / 180;
        const deltaLonRad = (other.longitude - this.longitude) * Math.PI / 180;
        const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    bearingTo(other) {
        const lat1Rad = this.latitude * Math.PI / 180;
        const lat2Rad = other.latitude * Math.PI / 180;
        const deltaLonRad = (other.longitude - this.longitude) * Math.PI / 180;
        const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);
        const bearingRad = Math.atan2(y, x);
        return ((bearingRad * 180 / Math.PI) + 360) % 360;
    }
    static validate(data) {
        return exports.SpatialLocationSchema.parse(data);
    }
    isValid() {
        return this.latitude >= -90 && this.latitude <= 90 &&
            this.longitude >= -180 && this.longitude <= 180;
    }
    toGeoJSON() {
        return {
            type: 'Point',
            coordinates: [this.longitude, this.latitude, this.elevation],
            properties: {
                utm_x: this.utm_x,
                utm_y: this.utm_y,
                mine_grid_x: this.mine_grid_x,
                mine_grid_y: this.mine_grid_y,
                coordinate_system: this.coordinate_system,
                accuracy: this.accuracy,
                timestamp: this.timestamp?.toISOString()
            }
        };
    }
    static fromGeoJSON(geojson) {
        if (geojson.type !== 'Point' || !Array.isArray(geojson.coordinates)) {
            throw new Error('Invalid GeoJSON Point format');
        }
        const [longitude, latitude, elevation = 0] = geojson.coordinates;
        const properties = geojson.properties || {};
        return new SpatialLocation({
            latitude,
            longitude,
            elevation,
            utm_x: properties.utm_x,
            utm_y: properties.utm_y,
            mine_grid_x: properties.mine_grid_x,
            mine_grid_y: properties.mine_grid_y,
            coordinate_system: properties.coordinate_system || 'WGS84',
            accuracy: properties.accuracy,
            timestamp: properties.timestamp ? new Date(properties.timestamp) : undefined
        });
    }
    toJSON() {
        return {
            latitude: this.latitude,
            longitude: this.longitude,
            elevation: this.elevation,
            utm_x: this.utm_x,
            utm_y: this.utm_y,
            mine_grid_x: this.mine_grid_x,
            mine_grid_y: this.mine_grid_y,
            coordinate_system: this.coordinate_system,
            accuracy: this.accuracy,
            timestamp: this.timestamp
        };
    }
}
exports.SpatialLocation = SpatialLocation;
//# sourceMappingURL=SpatialLocation.js.map