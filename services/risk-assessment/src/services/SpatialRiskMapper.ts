// Simplified spatial operations to avoid ES module issues in tests
import { Logger } from 'winston';
import { 
  RiskHeatmapCell, 
  VulnerableZone, 
  SpatialContext, 
  Infrastructure,
  SlopeSegment 
} from '../types';
import { RiskPrediction } from './RealTimeRiskPredictor';

export class SpatialRiskMapper {
  private logger: Logger;
  private spatialContext: SpatialContext;
  private gridResolution: number = 10; // meters
  private interpolationRadius: number = 100; // meters

  constructor(logger: Logger, initialSpatialContext: SpatialContext) {
    this.logger = logger;
    this.spatialContext = initialSpatialContext;
  }

  async generateRiskHeatmap(prediction: RiskPrediction): Promise<RiskHeatmapCell[][]> {
    const startTime = Date.now();

    try {
      // Get spatial bounds from slope segments
      const bounds = this.calculateSpatialBounds();
      
      // Create grid
      const grid = this.createSpatialGrid(bounds);

      // Interpolate risk values across grid
      const heatmap = await this.interpolateRiskValues(grid, prediction);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Risk heatmap generated in ${processingTime}ms`);

      return heatmap;

    } catch (error) {
      this.logger.error('Error generating risk heatmap:', error);
      throw error;
    }
  }

  async detectVulnerableZones(prediction: RiskPrediction): Promise<VulnerableZone[]> {
    const startTime = Date.now();

    try {
      const vulnerableZones: VulnerableZone[] = [];

      // Analyze each slope segment for vulnerability
      for (const segment of this.spatialContext.slope_segments) {
        const zoneRisk = this.calculateSegmentRisk(segment, prediction);
        
        if (zoneRisk.risk_probability > 0.3) { // Threshold for vulnerability
          const zone = await this.createVulnerableZone(segment, zoneRisk, prediction);
          vulnerableZones.push(zone);
        }
      }

      // Merge overlapping zones
      const mergedZones = this.mergeOverlappingZones(vulnerableZones);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Detected ${mergedZones.length} vulnerable zones in ${processingTime}ms`);

      return mergedZones;

    } catch (error) {
      this.logger.error('Error detecting vulnerable zones:', error);
      throw error;
    }
  }

  private calculateSpatialBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const segment of this.spatialContext.slope_segments) {
      const coords = segment.geometry.coordinates[0]; // Assuming polygon exterior ring
      
      for (const coord of coords) {
        const [x, y] = coord;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    // Add buffer
    const buffer = 50; // meters
    return {
      minX: minX - buffer,
      maxX: maxX + buffer,
      minY: minY - buffer,
      maxY: maxY + buffer
    };
  }

  private createSpatialGrid(bounds: { minX: number; maxX: number; minY: number; maxY: number }): { x: number; y: number }[][] {
    const grid: { x: number; y: number }[][] = [];
    
    const cols = Math.ceil((bounds.maxX - bounds.minX) / this.gridResolution);
    const rows = Math.ceil((bounds.maxY - bounds.minY) / this.gridResolution);

    for (let row = 0; row < rows; row++) {
      const gridRow: { x: number; y: number }[] = [];
      
      for (let col = 0; col < cols; col++) {
        const x = bounds.minX + col * this.gridResolution;
        const y = bounds.minY + row * this.gridResolution;
        gridRow.push({ x, y });
      }
      
      grid.push(gridRow);
    }

    return grid;
  }

  private async interpolateRiskValues(
    grid: { x: number; y: number }[][],
    prediction: RiskPrediction
  ): Promise<RiskHeatmapCell[][]> {
    const heatmap: RiskHeatmapCell[][] = [];

    for (let row = 0; row < grid.length; row++) {
      const heatmapRow: RiskHeatmapCell[] = [];

      for (let col = 0; col < grid[row].length; col++) {
        const point = grid[row][col];
        const cell = await this.interpolatePointRisk(point, prediction);
        heatmapRow.push(cell);
      }

      heatmap.push(heatmapRow);
    }

    return heatmap;
  }

  private async interpolatePointRisk(
    point: { x: number; y: number },
    prediction: RiskPrediction
  ): Promise<RiskHeatmapCell> {
    // Find nearby slope segments and their influence
    const influences: { segment: SlopeSegment; distance: number; weight: number }[] = [];

    for (const segment of this.spatialContext.slope_segments) {
      // Calculate segment center (simplified)
      const coords = segment.geometry.coordinates[0];
      const centerX = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
      const centerY = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
      
      // Calculate distance (simplified Euclidean distance)
      const pointDistance = Math.sqrt(
        Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
      );

      if (pointDistance <= this.interpolationRadius) {
        const weight = this.calculateDistanceWeight(pointDistance);
        influences.push({ segment, distance: pointDistance, weight });
      }
    }

    // Calculate interpolated risk
    let weightedRisk = 0;
    let totalWeight = 0;
    const contributingFactors: string[] = [];

    for (const influence of influences) {
      const segmentRisk = this.calculateSegmentRisk(influence.segment, prediction);
      weightedRisk += segmentRisk.risk_probability * influence.weight;
      totalWeight += influence.weight;

      // Add contributing factors
      if (segmentRisk.risk_probability > 0.3) {
        contributingFactors.push(`Slope segment ${influence.segment.id}`);
      }
    }

    const interpolatedRisk = totalWeight > 0 ? weightedRisk / totalWeight : 0;
    const confidence = this.calculateInterpolationConfidence(influences);

    // Estimate time to failure for this point
    const timeToFailure = this.estimatePointTimeToFailure(point, influences, prediction);

    return {
      x: point.x,
      y: point.y,
      risk_probability: interpolatedRisk,
      confidence: confidence,
      contributing_factors: contributingFactors,
      time_to_failure_hours: timeToFailure
    };
  }

  private calculateDistanceWeight(distance: number): number {
    // Inverse distance weighting with exponential decay
    const decayFactor = 0.1;
    return Math.exp(-decayFactor * distance / this.interpolationRadius);
  }

  private calculateSegmentRisk(segment: SlopeSegment, prediction: RiskPrediction): {
    risk_probability: number;
    confidence: number;
  } {
    // Base risk from prediction
    let riskProbability = prediction.risk_probability;

    // Adjust based on segment characteristics
    const slopeAngleFactor = Math.min(segment.slope_angle / 45, 2); // Normalize to 45° and cap at 2x
    const stabilityFactor = 1 - segment.stability_rating; // Lower stability = higher risk

    riskProbability *= slopeAngleFactor * (1 + stabilityFactor);
    riskProbability = Math.min(riskProbability, 1); // Cap at 100%

    // Calculate confidence based on data availability
    const confidence = this.calculateSegmentConfidence(segment);

    return {
      risk_probability: riskProbability,
      confidence: confidence
    };
  }

  private calculateSegmentConfidence(segment: SlopeSegment): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available data
    if (segment.stability_rating > 0) confidence += 0.2;
    if (segment.joint_orientation.length > 0) confidence += 0.2;
    if (segment.rock_type && segment.rock_type !== 'unknown') confidence += 0.1;

    return Math.min(confidence, 1);
  }

  private calculateInterpolationConfidence(influences: { segment: SlopeSegment; distance: number; weight: number }[]): number {
    if (influences.length === 0) return 0;

    // Confidence based on number of influences and their weights
    const totalWeight = influences.reduce((sum, inf) => sum + inf.weight, 0);
    const normalizedWeight = Math.min(totalWeight, 1);
    const influenceCount = Math.min(influences.length / 3, 1); // Normalize to 3 influences

    return (normalizedWeight + influenceCount) / 2;
  }

  private estimatePointTimeToFailure(
    point: { x: number; y: number },
    influences: { segment: SlopeSegment; distance: number; weight: number }[],
    prediction: RiskPrediction
  ): number | undefined {
    if (!prediction.time_to_failure_hours || influences.length === 0) {
      return undefined;
    }

    // Weight time to failure by segment characteristics
    let weightedTimeToFailure = 0;
    let totalWeight = 0;

    for (const influence of influences) {
      const segmentFactor = this.calculateSegmentTimeToFailureFactor(influence.segment);
      const adjustedTime = prediction.time_to_failure_hours * segmentFactor;
      
      weightedTimeToFailure += adjustedTime * influence.weight;
      totalWeight += influence.weight;
    }

    return totalWeight > 0 ? weightedTimeToFailure / totalWeight : prediction.time_to_failure_hours;
  }

  private calculateSegmentTimeToFailureFactor(segment: SlopeSegment): number {
    // Adjust time to failure based on segment characteristics
    let factor = 1.0;

    // Steeper slopes fail faster
    if (segment.slope_angle > 60) factor *= 0.5;
    else if (segment.slope_angle > 45) factor *= 0.7;

    // Lower stability means faster failure
    factor *= segment.stability_rating;

    return Math.max(factor, 0.1); // Minimum factor of 0.1
  }

  private async createVulnerableZone(
    segment: SlopeSegment,
    segmentRisk: { risk_probability: number; confidence: number },
    prediction: RiskPrediction
  ): Promise<VulnerableZone> {
    // Find affected infrastructure
    const affectedInfrastructure = this.findAffectedInfrastructure(segment);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(segmentRisk.risk_probability);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(riskLevel, affectedInfrastructure);

    return {
      id: `zone_${segment.id}_${Date.now()}`,
      geometry: segment.geometry,
      risk_level: riskLevel,
      risk_probability: segmentRisk.risk_probability,
      confidence_interval: [
        Math.max(0, segmentRisk.risk_probability - 0.1),
        Math.min(1, segmentRisk.risk_probability + 0.1)
      ],
      time_to_failure_hours: prediction.time_to_failure_hours,
      affected_infrastructure: affectedInfrastructure,
      recommended_actions: recommendedActions
    };
  }

  private findAffectedInfrastructure(segment: SlopeSegment): Infrastructure[] {
    const affected: Infrastructure[] = [];
    const bufferDistance = 100; // meters

    // Simplified intersection check using bounding box
    const segmentCoords = segment.geometry.coordinates[0];
    const segmentBounds = this.calculateBounds(segmentCoords);
    
    // Expand bounds by buffer distance
    const bufferedBounds = {
      minX: segmentBounds.minX - bufferDistance,
      maxX: segmentBounds.maxX + bufferDistance,
      minY: segmentBounds.minY - bufferDistance,
      maxY: segmentBounds.maxY + bufferDistance
    };

    for (const infrastructure of this.spatialContext.infrastructure) {
      let intersects = false;
      
      if (infrastructure.geometry.type === 'Point') {
        const [x, y] = infrastructure.geometry.coordinates;
        intersects = x >= bufferedBounds.minX && x <= bufferedBounds.maxX &&
                    y >= bufferedBounds.minY && y <= bufferedBounds.maxY;
      } else if (infrastructure.geometry.type === 'LineString') {
        // Check if any point of the line is within bounds
        intersects = infrastructure.geometry.coordinates.some(([x, y]) =>
          x >= bufferedBounds.minX && x <= bufferedBounds.maxX &&
          y >= bufferedBounds.minY && y <= bufferedBounds.maxY
        );
      } else if (infrastructure.geometry.type === 'Polygon') {
        // Check if any point of the polygon is within bounds
        intersects = infrastructure.geometry.coordinates[0].some(([x, y]) =>
          x >= bufferedBounds.minX && x <= bufferedBounds.maxX &&
          y >= bufferedBounds.minY && y <= bufferedBounds.maxY
        );
      }
      
      if (intersects) {
        affected.push(infrastructure);
      }
    }

    return affected;
  }

  private determineRiskLevel(riskProbability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskProbability >= 0.8) return 'critical';
    if (riskProbability >= 0.6) return 'high';
    if (riskProbability >= 0.4) return 'medium';
    return 'low';
  }

  private generateRecommendedActions(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    affectedInfrastructure: Infrastructure[]
  ): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('Immediately evacuate all personnel from the area');
        actions.push('Stop all operations in the affected zone');
        actions.push('Establish safety perimeter');
        break;
      case 'high':
        actions.push('Restrict personnel access to essential only');
        actions.push('Increase monitoring frequency');
        actions.push('Prepare evacuation procedures');
        break;
      case 'medium':
        actions.push('Increase monitoring frequency');
        actions.push('Brief personnel on elevated risk');
        actions.push('Review safety protocols');
        break;
      case 'low':
        actions.push('Continue routine monitoring');
        actions.push('Document risk assessment');
        break;
    }

    // Add infrastructure-specific actions
    if (affectedInfrastructure.length > 0) {
      const hasPersonnel = affectedInfrastructure.some(inf => inf.personnel_count && inf.personnel_count > 0);
      const hasHighValue = affectedInfrastructure.some(inf => inf.value > 1000000);

      if (hasPersonnel && riskLevel !== 'low') {
        actions.push('Relocate personnel from affected infrastructure');
      }
      if (hasHighValue && (riskLevel === 'high' || riskLevel === 'critical')) {
        actions.push('Consider relocating valuable equipment');
      }
    }

    return actions;
  }

  private mergeOverlappingZones(zones: VulnerableZone[]): VulnerableZone[] {
    const merged: VulnerableZone[] = [];
    const processed = new Set<string>();

    for (const zone of zones) {
      if (processed.has(zone.id)) continue;

      const overlapping = zones.filter(other => 
        other.id !== zone.id && 
        !processed.has(other.id) &&
        this.geometriesOverlap(zone.geometry, other.geometry)
      );

      if (overlapping.length > 0) {
        // Merge overlapping zones
        const mergedZone = this.mergeZones([zone, ...overlapping]);
        merged.push(mergedZone);
        
        // Mark all as processed
        processed.add(zone.id);
        overlapping.forEach(z => processed.add(z.id));
      } else {
        merged.push(zone);
        processed.add(zone.id);
      }
    }

    return merged;
  }

  private mergeZones(zones: VulnerableZone[]): VulnerableZone {
    // Simplified union - use bounding box of all zones
    const allCoords = zones.flatMap(zone => zone.geometry.coordinates[0]);
    const bounds = this.calculateBounds(allCoords);
    
    const unionGeometry: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [bounds.minX, bounds.minY],
        [bounds.maxX, bounds.minY],
        [bounds.maxX, bounds.maxY],
        [bounds.minX, bounds.maxY],
        [bounds.minX, bounds.minY]
      ]]
    };

    // Take highest risk level
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const highestRiskLevel = zones.reduce((highest, zone) => {
      const currentIndex = riskLevels.indexOf(zone.risk_level);
      const highestIndex = riskLevels.indexOf(highest);
      return currentIndex > highestIndex ? zone.risk_level : highest;
    }, 'low' as 'low' | 'medium' | 'high' | 'critical');

    // Average risk probability
    const avgRiskProbability = zones.reduce((sum, zone) => sum + zone.risk_probability, 0) / zones.length;

    // Combine affected infrastructure
    const allInfrastructure = zones.flatMap(zone => zone.affected_infrastructure);
    const uniqueInfrastructure = allInfrastructure.filter((inf, index, arr) => 
      arr.findIndex(other => other.id === inf.id) === index
    );

    // Combine recommended actions
    const allActions = zones.flatMap(zone => zone.recommended_actions);
    const uniqueActions = [...new Set(allActions)];

    return {
      id: `merged_${zones.map(z => z.id).join('_')}_${Date.now()}`,
      geometry: unionGeometry,
      risk_level: highestRiskLevel,
      risk_probability: avgRiskProbability,
      confidence_interval: [
        Math.max(0, avgRiskProbability - 0.15),
        Math.min(1, avgRiskProbability + 0.15)
      ],
      time_to_failure_hours: Math.min(...zones.map(z => z.time_to_failure_hours || Infinity).filter(t => t !== Infinity)) || undefined,
      affected_infrastructure: uniqueInfrastructure,
      recommended_actions: uniqueActions
    };
  }

  async updateSpatialContext(geologicalData: any): Promise<void> {
    // Update spatial context with new geological information
    // In real implementation, parse and integrate geological updates
    this.logger.debug('Updated spatial context with geological data');
  }

  async getCurrentSpatialContext(): Promise<SpatialContext> {
    return this.spatialContext;
  }

  private calculateBounds(coordinates: number[][]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const [x, y] of coordinates) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return { minX, maxX, minY, maxY };
  }

  private geometriesOverlap(geom1: GeoJSON.Polygon, geom2: GeoJSON.Polygon): boolean {
    // Simplified overlap check using bounding boxes
    const bounds1 = this.calculateBounds(geom1.coordinates[0]);
    const bounds2 = this.calculateBounds(geom2.coordinates[0]);
    
    return !(bounds1.maxX < bounds2.minX || bounds2.maxX < bounds1.minX ||
             bounds1.maxY < bounds2.minY || bounds2.maxY < bounds1.minY);
  }

  // Performance monitoring
  public getMapperMetrics(): {
    gridResolution: number;
    interpolationRadius: number;
    slopeSegmentCount: number;
    infrastructureCount: number;
  } {
    return {
      gridResolution: this.gridResolution,
      interpolationRadius: this.interpolationRadius,
      slopeSegmentCount: this.spatialContext.slope_segments.length,
      infrastructureCount: this.spatialContext.infrastructure.length
    };
  }
}