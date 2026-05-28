# Industrial Machine Guard

A Next.js Pages Router dashboard for industrial IoT monitoring with MQTT live telemetry and remote machine control.

## Overview

This project connects to the MQTT broker at `wss://broker.hivemq.com:8000/mqtt` and subscribes to:

- `factory/pump/data`
- `factory/motor/data`
- `factory/fan/data`

Each machine publishes JSON payloads containing:

```json
{
  "temp": 0,
  "current": 0,
  "vibration": 0,
  "runtime": 0,
  "status": "Healthy" | "Warning" | "Critical",
  "state": "ON" | "OFF"
}
```

Remote control messages are published to:

- `factory/{machine}/control`

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## File Structure

- `pages/index.js` — main dashboard page and MQTT listener
- `components/MachineCard.js` — machine card UI with metrics and controls
- `components/StatusIndicator.js` — status LED indicator
- `components/Chart.js` — live line charts using `recharts`
- `lib/mqtt.js` — reusable MQTT client with reconnect support
- `utils/helpers.js` — machine helpers, normalization, and formatting

## Development Mode

When running on `localhost`, the dashboard automatically uses mock MQTT data for development and testing:

- Simulated machine telemetry every 3-5 seconds
- Random status changes (Healthy/Warning/Critical)
- Control buttons work with mock responses
- No external MQTT broker required

## MQTT Connection

The dashboard connects to MQTT brokers with automatic fallback:

- **Primary**: `wss://broker.hivemq.com:8000/mqtt`
- **Fallback**: Multiple alternative brokers tried automatically

Connection features:
- Automatic reconnection with 5-second intervals
- 5-second connection timeout per broker
- Fallback to alternative broker if primary fails
- Browser console logging for connection status

## Notes

- The dashboard keeps the last 20 telemetry points for temperature and current.
- The theme uses a dark SCADA-style design for industrial monitoring.
- Check browser console for detailed MQTT connection logs.

## Troubleshooting

### MQTT Connection Issues

If you see "connack timeout" errors:

1. **Check Network**: Ensure WebSocket connections aren't blocked by firewall/proxy
2. **Browser Console**: Open DevTools (F12) → Console tab for connection details
3. **Fallback Broker**: Dashboard automatically tries alternative broker if primary fails
4. **VPN/Network**: Some corporate networks block WebSocket connections

### Testing MQTT

To test with real MQTT data, use an MQTT client to publish to topics like:
```bash
# Example data for pump
mosquitto_pub -h broker.hivemq.com -t factory/pump/data -m '{"temp": 45.2, "current": 2.1, "vibration": 0.8, "runtime": 1250, "status": "Healthy", "state": "ON"}'
```

<!-- Deployment trigger: rollback to stable state -->
