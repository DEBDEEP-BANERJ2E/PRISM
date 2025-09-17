#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SPI.h>
#include <LoRaWan_APP.h>
#include <Adafruit_BME280.h>
#include <Adafruit_MPU6050.h>
#include <esp_sleep.h>
#include <esp_wifi.h>
#include <esp_bt.h>

// LoRaWAN Configuration
#define RF_FREQUENCY                868000000 // Hz
#define TX_OUTPUT_POWER             14        // dBm
#define LORA_BANDWIDTH              0         // [0: 125 kHz, 1: 250 kHz, 2: 500 kHz, 3: Reserved]
#define LORA_SPREADING_FACTOR       7         // [SF7..SF12]
#define LORA_CODINGRATE             1         // [1: 4/5, 2: 4/6, 3: 4/7, 4: 4/8]
#define LORA_PREAMBLE_LENGTH        8         // Same for Tx and Rx
#define LORA_SYMBOL_TIMEOUT         0         // Symbols
#define LORA_FIX_LENGTH_PAYLOAD_ON  false
#define LORA_IQ_INVERSION_ON        false

// Device Configuration
static uint8_t devEui[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
static uint8_t appEui[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
static uint8_t appKey[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };

// Sensor instances
Adafruit_BME280 bme;
Adafruit_MPU6050 mpu;

// Pin definitions
#define BATTERY_PIN A0
#define SOLAR_PIN A1
#define TILT_X_PIN A2
#define TILT_Y_PIN A3
#define PIEZOMETER_PIN A4
#define STRAIN_GAUGE_PIN A5
#define LED_PIN 2

// Power management
#define DEEP_SLEEP_DURATION 15 * 60 * 1000000 // 15 minutes in microseconds
#define LOW_BATTERY_THRESHOLD 3.2
#define CRITICAL_BATTERY_THRESHOLD 3.0

// Data structures
struct SensorData {
  uint32_t timestamp;
  float latitude;
  float longitude;
  float elevation;
  float tilt_x;
  float tilt_y;
  float tilt_z;
  float accel_x;
  float accel_y;
  float accel_z;
  float gyro_x;
  float gyro_y;
  float gyro_z;
  float pore_pressure;
  float temperature;
  float humidity;
  float strain_gauge;
  float battery_voltage;
  uint8_t quality_flags;
  uint8_t battery_level;
  int8_t signal_strength;
};

struct EdgeAIResult {
  float anomaly_score;
  uint8_t risk_level; // 0=low, 1=medium, 2=high, 3=critical
  float confidence;
  uint32_t timestamp;
};

// Global variables
SensorData currentReading;
EdgeAIResult aiResult;
bool deviceJoined = false;
uint32_t lastTransmission = 0;
uint32_t transmissionInterval = 30 * 60 * 1000; // 30 minutes default
uint8_t failedTransmissions = 0;
bool emergencyMode = false;

// Lightweight neural network weights (simplified for ESP32)
float nn_weights_input_hidden[13][8];
float nn_weights_hidden_output[8];
float feature_means[13] = {0.0, 0.0, 0.0, 0.0, 0.0, 9.81, 0.0, 0.0, 0.0, 125.0, 20.0, 60.0, 50.0};
float feature_stds[13] = {0.1, 0.1, 0.1, 2.0, 2.0, 2.0, 0.01, 0.01, 0.01, 25.0, 10.0, 20.0, 25.0};

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  pinMode(SOLAR_PIN, INPUT);
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize sensors
  if (!bme.begin(0x76)) {
    Serial.println("Could not find BME280 sensor!");
  }
  
  if (!mpu.begin()) {
    Serial.println("Could not find MPU6050 sensor!");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }
  
  // Initialize LoRaWAN
  Mcu.begin();
  deviceState = DEVICE_STATE_INIT;
  LoRaWAN.ifskipjoin();
  
  // Initialize neural network weights with small random values
  initializeNeuralNetwork();
  
  Serial.println("Hexapod sensor pod initialized");
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  switch(deviceState) {
    case DEVICE_STATE_INIT:
      LoRaWAN.init(loraWanClass, loraWanRegion);
      deviceState = DEVICE_STATE_JOIN;
      break;
      
    case DEVICE_STATE_JOIN:
      LoRaWAN.join();
      break;
      
    case DEVICE_STATE_SEND:
      // Main sensor reading and transmission logic
      performSensorCycle();
      deviceState = DEVICE_STATE_CYCLE;
      break;
      
    case DEVICE_STATE_CYCLE:
      // Calculate sleep duration based on conditions
      uint32_t sleepDuration = calculateSleepDuration();
      LoRaWAN.cycle(sleepDuration);
      break;
      
    case DEVICE_STATE_SLEEP:
      LoRaWAN.sleep();
      break;
      
    default:
      deviceState = DEVICE_STATE_INIT;
      break;
  }
}

void performSensorCycle() {
  // Read all sensors
  readAllSensors();
  
  // Run edge AI analysis
  runEdgeAI();
  
  // Make local decisions
  processLocalDecisions();
  
  // Prepare and send data if needed
  if (shouldTransmitData()) {
    prepareTxFrame();
    LoRaWAN.send();
    lastTransmission = millis();
  }
}

void readAllSensors() {
  currentReading.timestamp = millis() / 1000; // Unix timestamp in seconds
  
  // Location (would be from GPS in real implementation)
  currentReading.latitude = -23.5505; // Example coordinates
  currentReading.longitude = -46.6333;
  currentReading.elevation = 760.0;
  
  // Read tilt sensors (analog inputs)
  currentReading.tilt_x = (analogRead(TILT_X_PIN) - 2048) / 2048.0; // Normalize to -1 to 1
  currentReading.tilt_y = (analogRead(TILT_Y_PIN) - 2048) / 2048.0;
  currentReading.tilt_z = 0.0; // Calculated from X and Y
  
  // Read IMU (MPU6050)
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  currentReading.accel_x = a.acceleration.x;
  currentReading.accel_y = a.acceleration.y;
  currentReading.accel_z = a.acceleration.z;
  currentReading.gyro_x = g.gyro.x;
  currentReading.gyro_y = g.gyro.y;
  currentReading.gyro_z = g.gyro.z;
  
  // Read environmental sensors (BME280)
  currentReading.temperature = bme.readTemperature();
  currentReading.humidity = bme.readHumidity();
  
  // Read piezometer (analog input with conditioning)
  float piezoVoltage = analogRead(PIEZOMETER_PIN) * 3.3 / 4095.0;
  currentReading.pore_pressure = (piezoVoltage - 0.5) * 250.0; // Convert to kPa
  
  // Read strain gauge (analog input with amplification)
  float strainVoltage = analogRead(STRAIN_GAUGE_PIN) * 3.3 / 4095.0;
  currentReading.strain_gauge = (strainVoltage - 1.65) * 1000.0; // Convert to microstrains
  
  // Read battery voltage
  float batteryVoltage = analogRead(BATTERY_PIN) * 3.3 / 4095.0 * 2.0; // Voltage divider
  currentReading.battery_voltage = batteryVoltage;
  currentReading.battery_level = calculateBatteryLevel(batteryVoltage);
  
  // Set quality flags based on sensor validation
  currentReading.quality_flags = validateSensorReadings();
  
  // Get signal strength (RSSI)
  currentReading.signal_strength = LoRaWAN.getRSSI();
  
  Serial.printf("Sensors read - Temp: %.1f°C, Humidity: %.1f%%, Battery: %.1f%%\n", 
                currentReading.temperature, currentReading.humidity, currentReading.battery_level);
}

void runEdgeAI() {
  // Prepare features for neural network
  float features[13] = {
    currentReading.tilt_x,
    currentReading.tilt_y,
    currentReading.tilt_z,
    currentReading.accel_x,
    currentReading.accel_y,
    currentReading.accel_z,
    currentReading.gyro_x,
    currentReading.gyro_y,
    currentReading.gyro_z,
    currentReading.pore_pressure,
    currentReading.temperature,
    currentReading.humidity,
    currentReading.strain_gauge
  };
  
  // Normalize features
  for (int i = 0; i < 13; i++) {
    features[i] = (features[i] - feature_means[i]) / feature_stds[i];
  }
  
  // Forward pass through neural network
  float hidden[8] = {0};
  
  // Input to hidden layer
  for (int h = 0; h < 8; h++) {
    for (int i = 0; i < 13; i++) {
      hidden[h] += nn_weights_input_hidden[i][h] * features[i];
    }
    hidden[h] = fmax(0, hidden[h]); // ReLU activation
  }
  
  // Hidden to output layer
  float output = 0;
  for (int h = 0; h < 8; h++) {
    output += nn_weights_hidden_output[h] * hidden[h];
  }
  
  // Sigmoid activation for anomaly score
  aiResult.anomaly_score = 1.0 / (1.0 + exp(-output));
  
  // Determine risk level
  if (aiResult.anomaly_score < 0.3) aiResult.risk_level = 0; // low
  else if (aiResult.anomaly_score < 0.6) aiResult.risk_level = 1; // medium
  else if (aiResult.anomaly_score < 0.8) aiResult.risk_level = 2; // high
  else aiResult.risk_level = 3; // critical
  
  // Calculate confidence (simplified)
  aiResult.confidence = 0.8; // Would be more sophisticated in real implementation
  aiResult.timestamp = currentReading.timestamp;
  
  Serial.printf("Edge AI - Anomaly Score: %.3f, Risk Level: %d\n", 
                aiResult.anomaly_score, aiResult.risk_level);
}

void processLocalDecisions() {
  // Emergency mode activation
  if (aiResult.risk_level == 3 && aiResult.confidence > 0.7) {
    if (!emergencyMode) {
      emergencyMode = true;
      transmissionInterval = 1 * 60 * 1000; // 1 minute in emergency mode
      Serial.println("EMERGENCY MODE ACTIVATED");
      
      // Flash LED rapidly
      for (int i = 0; i < 10; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
      }
    }
  } else if (emergencyMode && aiResult.risk_level == 0) {
    emergencyMode = false;
    transmissionInterval = 30 * 60 * 1000; // Back to 30 minutes
    Serial.println("Emergency mode deactivated");
  }
  
  // Adjust transmission interval based on risk and battery
  if (aiResult.risk_level >= 2) {
    transmissionInterval = 5 * 60 * 1000; // 5 minutes for high risk
  } else if (aiResult.risk_level == 1) {
    transmissionInterval = 15 * 60 * 1000; // 15 minutes for medium risk
  } else {
    transmissionInterval = 30 * 60 * 1000; // 30 minutes for low risk
  }
  
  // Battery-based adjustments
  if (currentReading.battery_level < 20) {
    transmissionInterval *= 2; // Double interval for low battery
  }
  
  // Power management decisions
  if (currentReading.battery_voltage < CRITICAL_BATTERY_THRESHOLD) {
    Serial.println("Critical battery - entering deep sleep");
    enterDeepSleep(4 * 60 * 60); // 4 hours deep sleep
  }
}

bool shouldTransmitData() {
  uint32_t timeSinceLastTx = millis() - lastTransmission;
  
  // Always transmit in emergency mode
  if (emergencyMode) return true;
  
  // Transmit if interval has passed
  if (timeSinceLastTx >= transmissionInterval) return true;
  
  // Transmit for high risk conditions
  if (aiResult.risk_level >= 2) return true;
  
  return false;
}

void prepareTxFrame() {
  // Prepare compact binary payload for LoRaWAN transmission
  uint8_t payload[64];
  int index = 0;
  
  // Timestamp (4 bytes)
  payload[index++] = (currentReading.timestamp >> 24) & 0xFF;
  payload[index++] = (currentReading.timestamp >> 16) & 0xFF;
  payload[index++] = (currentReading.timestamp >> 8) & 0xFF;
  payload[index++] = currentReading.timestamp & 0xFF;
  
  // Location (12 bytes - floats)
  memcpy(&payload[index], &currentReading.latitude, 4); index += 4;
  memcpy(&payload[index], &currentReading.longitude, 4); index += 4;
  memcpy(&payload[index], &currentReading.elevation, 4); index += 4;
  
  // Sensor measurements (26 bytes - scaled to int16)
  int16_t measurements[13] = {
    (int16_t)(currentReading.tilt_x * 1000),
    (int16_t)(currentReading.tilt_y * 1000),
    (int16_t)(currentReading.tilt_z * 1000),
    (int16_t)(currentReading.accel_x * 100),
    (int16_t)(currentReading.accel_y * 100),
    (int16_t)(currentReading.accel_z * 100),
    (int16_t)(currentReading.gyro_x * 1000),
    (int16_t)(currentReading.gyro_y * 1000),
    (int16_t)(currentReading.gyro_z * 1000),
    (int16_t)(currentReading.pore_pressure),
    (int16_t)(currentReading.temperature * 10),
    (int16_t)(currentReading.humidity),
    (int16_t)(currentReading.strain_gauge)
  };
  
  for (int i = 0; i < 13; i++) {
    payload[index++] = (measurements[i] >> 8) & 0xFF;
    payload[index++] = measurements[i] & 0xFF;
  }
  
  // Quality flags, battery level, signal strength (3 bytes)
  payload[index++] = currentReading.quality_flags;
  payload[index++] = currentReading.battery_level;
  payload[index++] = (uint8_t)(currentReading.signal_strength + 128); // Convert to unsigned
  
  // AI result (6 bytes)
  uint16_t anomaly_score_scaled = (uint16_t)(aiResult.anomaly_score * 1000);
  payload[index++] = (anomaly_score_scaled >> 8) & 0xFF;
  payload[index++] = anomaly_score_scaled & 0xFF;
  payload[index++] = aiResult.risk_level;
  uint16_t confidence_scaled = (uint16_t)(aiResult.confidence * 1000);
  payload[index++] = (confidence_scaled >> 8) & 0xFF;
  payload[index++] = confidence_scaled & 0xFF;
  payload[index++] = emergencyMode ? 1 : 0;
  
  // Set the payload
  appDataSize = index;
  memcpy(appData, payload, index);
  
  Serial.printf("Prepared payload: %d bytes\n", index);
}

uint32_t calculateSleepDuration() {
  uint32_t baseSleep = 15 * 60 * 1000; // 15 minutes default
  
  // Adjust based on risk level
  switch (aiResult.risk_level) {
    case 3: baseSleep = 30 * 1000; break;    // 30 seconds for critical
    case 2: baseSleep = 2 * 60 * 1000; break; // 2 minutes for high
    case 1: baseSleep = 5 * 60 * 1000; break; // 5 minutes for medium
    default: baseSleep = 15 * 60 * 1000; break; // 15 minutes for low
  }
  
  // Adjust based on battery level
  if (currentReading.battery_level < 20) {
    baseSleep *= 2; // Double sleep time for low battery
  } else if (currentReading.battery_level < 10) {
    baseSleep *= 4; // Quadruple sleep time for very low battery
  }
  
  // Check if solar charging (simplified - based on time of day)
  int hour = (millis() / 3600000) % 24; // Rough hour calculation
  bool isDaytime = (hour >= 6 && hour <= 18);
  if (isDaytime && currentReading.battery_level > 80) {
    baseSleep *= 0.7; // Reduce sleep time when charging and battery is good
  }
  
  return baseSleep;
}

uint8_t calculateBatteryLevel(float voltage) {
  // LiFePO4 battery discharge curve
  if (voltage >= 3.7) return 100;
  if (voltage >= 3.5) return 80;
  if (voltage >= 3.3) return 60;
  if (voltage >= 3.2) return 40;
  if (voltage >= 3.1) return 20;
  if (voltage >= 3.0) return 10;
  return 0;
}

uint8_t validateSensorReadings() {
  uint8_t flags = 0;
  
  // Validate tilt readings
  if (abs(currentReading.tilt_x) <= 1.0 && abs(currentReading.tilt_y) <= 1.0) {
    flags |= 0x01;
  }
  
  // Validate accelerometer readings
  if (abs(currentReading.accel_x) <= 20 && abs(currentReading.accel_y) <= 20 && 
      currentReading.accel_z >= 5 && currentReading.accel_z <= 15) {
    flags |= 0x02;
  }
  
  // Validate gyroscope readings
  if (abs(currentReading.gyro_x) <= 10 && abs(currentReading.gyro_y) <= 10 && 
      abs(currentReading.gyro_z) <= 10) {
    flags |= 0x04;
  }
  
  // Validate pressure reading
  if (currentReading.pore_pressure >= 0 && currentReading.pore_pressure <= 1000) {
    flags |= 0x08;
  }
  
  // Validate environmental readings
  if (currentReading.temperature >= -40 && currentReading.temperature <= 70 &&
      currentReading.humidity >= 0 && currentReading.humidity <= 100) {
    flags |= 0x10;
  }
  
  // Validate strain gauge reading
  if (abs(currentReading.strain_gauge) <= 1000) {
    flags |= 0x20;
  }
  
  return flags;
}

void initializeNeuralNetwork() {
  // Initialize neural network weights with small random values
  for (int i = 0; i < 13; i++) {
    for (int h = 0; h < 8; h++) {
      nn_weights_input_hidden[i][h] = (random(-100, 100) / 1000.0); // -0.1 to 0.1
    }
  }
  
  for (int h = 0; h < 8; h++) {
    nn_weights_hidden_output[h] = (random(-100, 100) / 1000.0); // -0.1 to 0.1
  }
  
  Serial.println("Neural network initialized");
}

void enterDeepSleep(uint32_t sleepTimeSeconds) {
  Serial.printf("Entering deep sleep for %d seconds\n", sleepTimeSeconds);
  
  // Turn off peripherals
  esp_wifi_stop();
  esp_bt_controller_disable();
  
  // Configure wake-up timer
  esp_sleep_enable_timer_wakeup(sleepTimeSeconds * 1000000ULL);
  
  // Enter deep sleep
  esp_deep_sleep_start();
}

// LoRaWAN callback functions
void downLinkDataHandle(McpsIndication_t *mcpsIndication) {
  Serial.printf("Received downlink: rssi = %d, snr = %d, datarate = %d, length = %d\n",
                mcpsIndication->Rssi, (int)mcpsIndication->Snr, 
                (int)mcpsIndication->RxDatarate, mcpsIndication->BufferSize);
  
  // Handle configuration updates from downlink
  if (mcpsIndication->BufferSize > 0) {
    handleDownlinkCommand(mcpsIndication->Buffer, mcpsIndication->BufferSize);
  }
}

void handleDownlinkCommand(uint8_t* buffer, uint8_t size) {
  if (size < 2) return;
  
  uint8_t command = buffer[0];
  uint8_t value = buffer[1];
  
  switch (command) {
    case 0x01: // Update transmission interval
      transmissionInterval = value * 60 * 1000; // Minutes to milliseconds
      Serial.printf("Transmission interval updated to %d minutes\n", value);
      break;
      
    case 0x02: // Force transmission
      lastTransmission = 0; // Force next transmission
      Serial.println("Forced transmission requested");
      break;
      
    case 0x03: // Enter maintenance mode
      Serial.println("Entering maintenance mode");
      // Implementation would stop normal operation
      break;
      
    case 0x04: // Update AI threshold
      // Would update anomaly detection threshold
      Serial.printf("AI threshold update: %d\n", value);
      break;
      
    default:
      Serial.printf("Unknown command: 0x%02X\n", command);
      break;
  }
}

void onJoinSuccess() {
  deviceJoined = true;
  Serial.println("LoRaWAN network joined successfully");
  deviceState = DEVICE_STATE_SEND;
}

void onJoinFailed() {
  Serial.println("LoRaWAN join failed");
  failedTransmissions++;
  deviceState = DEVICE_STATE_JOIN;
}

void onSendSuccess() {
  Serial.println("Data transmission successful");
  failedTransmissions = 0;
  deviceState = DEVICE_STATE_CYCLE;
}

void onSendFailed() {
  Serial.println("Data transmission failed");
  failedTransmissions++;
  deviceState = DEVICE_STATE_CYCLE;
}