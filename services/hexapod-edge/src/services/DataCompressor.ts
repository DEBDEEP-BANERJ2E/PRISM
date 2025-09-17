import { SensorReading, CompressionConfig } from '../types';

export class DataCompressor {
  private config: CompressionConfig;
  private compressionBuffer: SensorReading[] = [];
  private lastCompressedData: any = null;

  constructor(config: CompressionConfig) {
    this.config = config;
  }

  addReading(reading: SensorReading): void {
    this.compressionBuffer.push(reading);
    
    // Auto-compress when buffer reaches batch size
    if (this.compressionBuffer.length >= this.config.batchSize) {
      this.compressBatch();
    }
  }

  compressBatch(): Buffer | null {
    if (this.compressionBuffer.length === 0) {
      return null;
    }

    let compressedData: Buffer;

    switch (this.config.algorithm) {
      case 'delta':
        compressedData = this.deltaCompress(this.compressionBuffer);
        break;
      case 'lz4':
        compressedData = this.lz4Compress(this.compressionBuffer);
        break;
      case 'zlib':
        compressedData = this.zlibCompress(this.compressionBuffer);
        break;
      default:
        compressedData = this.deltaCompress(this.compressionBuffer);
    }

    // Clear buffer after compression
    this.compressionBuffer = [];
    
    return compressedData;
  }

  private deltaCompress(readings: SensorReading[]): Buffer {
    // Delta compression - store first reading fully, then only differences
    if (readings.length === 0) return Buffer.alloc(0);

    const compressed: any = {
      algorithm: 'delta',
      count: readings.length,
      base: null,
      deltas: []
    };

    // Store first reading as base
    compressed.base = this.serializeReading(readings[0]);

    // Store deltas for subsequent readings
    for (let i = 1; i < readings.length; i++) {
      const delta = this.calculateDelta(readings[i - 1], readings[i]);
      compressed.deltas.push(delta);
    }

    return Buffer.from(JSON.stringify(compressed));
  }

  private calculateDelta(previous: SensorReading, current: SensorReading): any {
    const delta: any = {
      timestamp: current.timestamp - previous.timestamp,
      measurements: {}
    };

    // Calculate deltas for measurements
    const prevMeas = previous.measurements;
    const currMeas = current.measurements;

    Object.keys(currMeas).forEach(key => {
      if (typeof currMeas[key as keyof typeof currMeas] === 'number' && 
          typeof prevMeas[key as keyof typeof prevMeas] === 'number') {
        const diff = (currMeas[key as keyof typeof currMeas] as number) - 
                    (prevMeas[key as keyof typeof prevMeas] as number);
        
        // Only store delta if it's significant (reduces data size)
        if (Math.abs(diff) > this.getSignificanceThreshold(key)) {
          delta.measurements[key] = diff;
        }
      }
    });

    // Store other fields only if they changed
    if (current.batteryLevel !== previous.batteryLevel) {
      delta.batteryLevel = current.batteryLevel - previous.batteryLevel;
    }

    if (current.signalStrength !== previous.signalStrength) {
      delta.signalStrength = current.signalStrength - previous.signalStrength;
    }

    return delta;
  }

  private getSignificanceThreshold(measurementType: string): number {
    // Define significance thresholds for different measurement types
    const thresholds: { [key: string]: number } = {
      'tilt_x': 0.001,
      'tilt_y': 0.001,
      'tilt_z': 0.001,
      'accel_x': 0.01,
      'accel_y': 0.01,
      'accel_z': 0.01,
      'gyro_x': 0.001,
      'gyro_y': 0.001,
      'gyro_z': 0.001,
      'pore_pressure': 0.1,
      'temperature': 0.1,
      'humidity': 0.5,
      'strain_gauge': 0.1,
      'battery_voltage': 0.01
    };

    return thresholds[measurementType] || 0.001;
  }

  private lz4Compress(readings: SensorReading[]): Buffer {
    // Simplified LZ4-style compression (in real implementation, use actual LZ4 library)
    const jsonData = JSON.stringify(readings.map(r => this.serializeReading(r)));
    
    // Simple run-length encoding as LZ4 approximation
    return this.runLengthEncode(Buffer.from(jsonData));
  }

  private zlibCompress(readings: SensorReading[]): Buffer {
    // Simplified zlib-style compression (in real implementation, use actual zlib)
    const jsonData = JSON.stringify(readings.map(r => this.serializeReading(r)));
    
    // Simple dictionary-based compression as zlib approximation
    return this.dictionaryCompress(Buffer.from(jsonData));
  }

  private runLengthEncode(data: Buffer): Buffer {
    // Simple run-length encoding
    const compressed: number[] = [];
    let i = 0;

    while (i < data.length) {
      const currentByte = data[i];
      let count = 1;

      // Count consecutive identical bytes
      while (i + count < data.length && data[i + count] === currentByte && count < 255) {
        count++;
      }

      // Store byte and count
      compressed.push(currentByte, count);
      i += count;
    }

    return Buffer.from(compressed);
  }

  private dictionaryCompress(data: Buffer): Buffer {
    // Simple dictionary-based compression
    const dictionary = new Map<string, number>();
    const compressed: number[] = [];
    let dictIndex = 0;

    // Build dictionary of common patterns
    for (let i = 0; i < data.length - 2; i++) {
      const pattern = data.slice(i, i + 3).toString('hex');
      if (!dictionary.has(pattern)) {
        dictionary.set(pattern, dictIndex++);
      }
    }

    // Compress using dictionary
    let i = 0;
    while (i < data.length) {
      if (i <= data.length - 3) {
        const pattern = data.slice(i, i + 3).toString('hex');
        if (dictionary.has(pattern)) {
          compressed.push(255, dictionary.get(pattern)!); // 255 as escape code
          i += 3;
          continue;
        }
      }
      compressed.push(data[i]);
      i++;
    }

    // Prepend dictionary size and dictionary
    const dictEntries = Array.from(dictionary.entries()).flat();
    const dictData = dictEntries.map(item => typeof item === 'string' ? parseInt(item, 16) : item);
    return Buffer.from([dictData.length, ...dictData, ...compressed]);
  }

  private serializeReading(reading: SensorReading): any {
    // Serialize reading to a more compact format
    return {
      id: reading.sensorId,
      ts: reading.timestamp,
      loc: [reading.location.latitude, reading.location.longitude, reading.location.elevation],
      m: [
        reading.measurements.tilt_x,
        reading.measurements.tilt_y,
        reading.measurements.tilt_z,
        reading.measurements.accel_x,
        reading.measurements.accel_y,
        reading.measurements.accel_z,
        reading.measurements.gyro_x,
        reading.measurements.gyro_y,
        reading.measurements.gyro_z,
        reading.measurements.pore_pressure,
        reading.measurements.temperature,
        reading.measurements.humidity,
        reading.measurements.strain_gauge,
        reading.measurements.battery_voltage
      ],
      q: this.packQualityFlags(reading.qualityFlags),
      b: reading.batteryLevel,
      s: reading.signalStrength
    };
  }

  private packQualityFlags(flags: any): number {
    // Pack quality flags into a single byte
    let packed = 0;
    if (flags.tilt_valid) packed |= 0x01;
    if (flags.accel_valid) packed |= 0x02;
    if (flags.gyro_valid) packed |= 0x04;
    if (flags.pressure_valid) packed |= 0x08;
    if (flags.environmental_valid) packed |= 0x10;
    if (flags.strain_valid) packed |= 0x20;
    return packed;
  }

  decompressData(compressedData: Buffer): SensorReading[] {
    try {
      const data = JSON.parse(compressedData.toString());
      
      switch (data.algorithm) {
        case 'delta':
          return this.deltaDecompress(data);
        case 'lz4':
          return this.lz4Decompress(compressedData);
        case 'zlib':
          return this.zlibDecompress(compressedData);
        default:
          throw new Error(`Unknown compression algorithm: ${data.algorithm}`);
      }
    } catch (error) {
      console.error('Decompression error:', error);
      return [];
    }
  }

  private deltaDecompress(data: any): SensorReading[] {
    const readings: SensorReading[] = [];
    
    // Reconstruct base reading
    const baseReading = this.deserializeReading(data.base);
    readings.push(baseReading);

    // Reconstruct subsequent readings from deltas
    let currentReading = baseReading;
    for (const delta of data.deltas) {
      currentReading = this.applyDelta(currentReading, delta);
      readings.push(currentReading);
    }

    return readings;
  }

  private applyDelta(baseReading: SensorReading, delta: any): SensorReading {
    const newReading: SensorReading = JSON.parse(JSON.stringify(baseReading)); // Deep copy

    // Apply timestamp delta
    newReading.timestamp = baseReading.timestamp + delta.timestamp;

    // Apply measurement deltas
    Object.keys(delta.measurements).forEach(key => {
      if (key in newReading.measurements) {
        (newReading.measurements as any)[key] += delta.measurements[key];
      }
    });

    // Apply other deltas
    if ('batteryLevel' in delta) {
      newReading.batteryLevel += delta.batteryLevel;
    }

    if ('signalStrength' in delta) {
      newReading.signalStrength += delta.signalStrength;
    }

    return newReading;
  }

  private lz4Decompress(compressedData: Buffer): SensorReading[] {
    // Decompress run-length encoded data
    const decompressed = this.runLengthDecode(compressedData);
    const jsonData = decompressed.toString();
    const serializedReadings = JSON.parse(jsonData);
    
    return serializedReadings.map((sr: any) => this.deserializeReading(sr));
  }

  private zlibDecompress(compressedData: Buffer): SensorReading[] {
    // Decompress dictionary-based compression
    const decompressed = this.dictionaryDecompress(compressedData);
    const jsonData = decompressed.toString();
    const serializedReadings = JSON.parse(jsonData);
    
    return serializedReadings.map((sr: any) => this.deserializeReading(sr));
  }

  private runLengthDecode(compressed: Buffer): Buffer {
    const decompressed: number[] = [];
    
    for (let i = 0; i < compressed.length; i += 2) {
      const byte = compressed[i];
      const count = compressed[i + 1];
      
      for (let j = 0; j < count; j++) {
        decompressed.push(byte);
      }
    }
    
    return Buffer.from(decompressed);
  }

  private dictionaryDecompress(compressed: Buffer): Buffer {
    // Extract dictionary
    const dictSize = compressed[0];
    const dictData = compressed.slice(1, 1 + dictSize);
    const compressedData = compressed.slice(1 + dictSize);
    
    // Rebuild dictionary
    const dictionary = new Map<number, string>();
    for (let i = 0; i < dictData.length; i += 2) {
      dictionary.set(dictData[i + 1], dictData[i].toString());
    }
    
    // Decompress data
    const decompressed: number[] = [];
    let i = 0;
    
    while (i < compressedData.length) {
      if (compressedData[i] === 255 && i + 1 < compressedData.length) {
        // Dictionary reference
        const dictIndex = compressedData[i + 1];
        const pattern = dictionary.get(dictIndex);
        if (pattern) {
          const patternBytes = Buffer.from(pattern, 'hex');
          decompressed.push(...Array.from(patternBytes));
        }
        i += 2;
      } else {
        decompressed.push(compressedData[i]);
        i++;
      }
    }
    
    return Buffer.from(decompressed);
  }

  private deserializeReading(serialized: any): SensorReading {
    return {
      sensorId: serialized.id,
      timestamp: serialized.ts,
      location: {
        latitude: serialized.loc[0],
        longitude: serialized.loc[1],
        elevation: serialized.loc[2]
      },
      measurements: {
        tilt_x: serialized.m[0],
        tilt_y: serialized.m[1],
        tilt_z: serialized.m[2],
        accel_x: serialized.m[3],
        accel_y: serialized.m[4],
        accel_z: serialized.m[5],
        gyro_x: serialized.m[6],
        gyro_y: serialized.m[7],
        gyro_z: serialized.m[8],
        pore_pressure: serialized.m[9],
        temperature: serialized.m[10],
        humidity: serialized.m[11],
        strain_gauge: serialized.m[12],
        battery_voltage: serialized.m[13]
      },
      qualityFlags: this.unpackQualityFlags(serialized.q),
      batteryLevel: serialized.b,
      signalStrength: serialized.s
    };
  }

  private unpackQualityFlags(packed: number): any {
    return {
      tilt_valid: (packed & 0x01) !== 0,
      accel_valid: (packed & 0x02) !== 0,
      gyro_valid: (packed & 0x04) !== 0,
      pressure_valid: (packed & 0x08) !== 0,
      environmental_valid: (packed & 0x10) !== 0,
      strain_valid: (packed & 0x20) !== 0
    };
  }

  getCompressionStats(): {
    algorithm: string;
    bufferSize: number;
    compressionRatio: number;
    lastCompressedSize: number;
  } {
    return {
      algorithm: this.config.algorithm,
      bufferSize: this.compressionBuffer.length,
      compressionRatio: this.lastCompressedData ? 
        (this.lastCompressedData.originalSize / this.lastCompressedData.compressedSize) : 1,
      lastCompressedSize: this.lastCompressedData ? this.lastCompressedData.compressedSize : 0
    };
  }

  setCompressionLevel(level: number): void {
    this.config.compressionLevel = Math.max(1, Math.min(9, level));
  }

  setBatchSize(size: number): void {
    this.config.batchSize = Math.max(1, Math.min(100, size));
  }

  clearBuffer(): void {
    this.compressionBuffer = [];
  }
}