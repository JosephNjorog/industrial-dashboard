# Industrial Machine Guard: System Overview

The **Industrial Machine Guard** is a production-grade, real-time IoT monitoring and control platform. It bridges the gap between physical industrial hardware (ESP32 microcontrollers) and a modern, high-performance web interface. 

The system is designed with a strict **safety-first architecture**, utilizing high-speed telemetry, predictive maintenance algorithms, and hardware-enforced safety gates.

---

## 1. System Architecture
*   **Frontend**: Built with **Next.js 14** and React. It operates as a highly responsive Single Page Application (SPA).
*   **Hardware Layer**: **ESP32 Microcontroller** running custom C++ firmware. It processes sensors (DS18B20 for temperature, MPU6050 for vibration) and controls hardware relays.
*   **Communication Protocol**: **MQTT over WebSockets (WSS)** via HiveMQ Cloud. It provides secure, bi-directional, real-time data streaming.
*   **Data Persistence**: A custom JSON-based local database (`lib/db.js`) backed by Next.js API routes (`/api/logs`, `/api/insights`) to persist historical activity and diagnostic data across sessions.

---

## 2. Core Features

### 🏢 3D Isometric Digital Twin
*   A fully rendered **Volumetric 3D spatial map** of the factory floor built purely with CSS 3D transforms.
*   Features realistic industrial machine models with dynamic cooling vents, drop shadows, and LED status indicators.
*   The models respond in real-time to the hardware: glowing green when operational, flashing red during critical faults, and reflecting live temperature and load data on holographic hovering tags.

### 📊 Real-Time Telemetry & Predictive Analytics
*   The dashboard ingests telemetry at **5Hz (every 200ms)** without lagging the browser.
*   It calculates moving averages, variance, and standard deviations to detect anomalies.
*   **Predictive Maintenance Engine**: Computes a "Failure Probability" and "Time-To-Failure (TTF)" score using a weighted risk algorithm analyzing thermal overload, vibration trends, and current spikes.

### 🛡️ Hardware-Enforced Safety Protocol (The "Handshake")
The system does not blindly trust user input. It uses an **Explicit ACK/NACK Handshake**:
1.  **Command Validation**: When a user clicks "Turn ON", the UI sends a command ID to the ESP32.
2.  **Safety Gate**: The ESP32 evaluates its internal safety metrics. If the machine's failure probability is >80%, the ESP32 physically blocks the relay from triggering.
3.  **Explicit NACK**: The ESP32 sends a `"NACK"` (Negative Acknowledgment) back to the dashboard.
4.  **UI Sync**: The dashboard intercepts the NACK, stops the loading spinner, blocks the state change, and alerts the user that the hardware rejected the command for safety reasons.

### 🔌 Last Will and Testament (LWT) "Dead Man's Switch"
*   The ESP32 firmware is configured with an MQTT LWT. If the ESP32 loses power or network connection unexpectedly, the HiveMQ broker automatically fires an `OFFLINE` packet to the dashboard.
*   **Frontend Fallback**: To combat broker delays, the dashboard also runs a silent **3-second countdown timer**. If 3 seconds pass without receiving the 200ms telemetry data, the dashboard independently forces the UI into an `OFFLINE` state, ensuring you never see phantom "running" data.

### 📜 Centralized Activity & Insight Logs
*   A dedicated "Logs" tab replaces cluttered popups.
*   **System Activity**: Tracks every command sent, ACK received, and connectivity event with exact timestamps.
*   **Diagnostic Engine**: Automatically logs AI-like insights (e.g., *"Motor temperature is rising unusually fast compared to historical baselines"*) when anomalies are detected, saving them to the persistent database.

---

## 3. Design Aesthetics
*   **Glassmorphism**: Built with semi-transparent frosted glass panels, deep shadows, and subtle blurs (`backdrop-filter`) to create a premium, modern feel.
*   **Dynamic Theme Toggle**: Seamlessly switches between an ultra-dark "Command Center" mode and a crisp "Daylight" mode, recalculating colors, borders, and SVGs instantly.
*   **Micro-interactions**: Uses custom CSS animations (like pulsing alerts, sliding modals, and smooth state transitions) to make the interface feel alive and highly responsive.
