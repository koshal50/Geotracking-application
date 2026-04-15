# 🌍 GeoTracker — IP Geolocation Web Application

A modern, mobile-first IP geolocation web application built with **Spring Boot** and vanilla **JavaScript**. Track IP addresses, resolve domains, validate IPs, and view locations on an interactive map.

![Java](https://img.shields.io/badge/Java-17-blue) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🏠 Dashboard** — Real-time IP info with network status
- **🗺️ Interactive Map** — Leaflet-powered geolocation visualization
- **🔍 IP Lookup** — Detailed geolocation & ISP data for any IP address
- **🌐 Domain to IP** — Resolve hostnames to IP addresses
- **✅ IP Validator** — Validate IPv4/IPv6 address syntax
- **📡 Network Info** — Local network diagnostics with live ping
- **📜 Search History** — Persistent lookup history with favorites & notes
- **🌙 Dark Mode** — Full dark/light theme with CSS custom properties
- **🔐 Authentication** — Local user registration & login system

## 🚀 Getting Started

### Prerequisites

- **Java 17+**
- **Maven 3.8+** (or use the included Maven wrapper)
- **ipstack API Key** — Get one free at [ipstack.com](https://ipstack.com/)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/koshal50/Geotracking-application.git
   cd Geotracking-application
   ```

2. **Create a `.env` file** in the project root:
   ```env
   IPSTACK_API_KEY=your_api_key_here
   SERVER_PORT=8080
   ```

3. **Run the application**
   ```bash
   # Using Maven wrapper (recommended)
   ./mvnw spring-boot:run

   # Or with Maven installed
   mvn spring-boot:run
   ```

4. **Open in browser**
   ```
   http://localhost:8080
   ```

## 🏗️ Project Structure

```
├── src/
│   └── main/
│       ├── java/com/digitalnavigator/
│       │   ├── Application.java          # Spring Boot entry point
│       │   └── ApiController.java        # REST API controller
│       └── resources/
│           ├── application.properties    # App configuration
│           └── static/
│               ├── index.html            # SPA shell with CSS
│               ├── app.js               # All page logic & templates
│               └── homepage.png          # Dashboard map image
├── .env                                  # API keys (not committed)
├── pom.xml                              # Maven dependencies
└── README.md
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2.5, Java 17 |
| Frontend | Vanilla JS, Tailwind CSS (CDN), CSS Custom Properties |
| Map | Leaflet.js |
| API | ipstack Geolocation API |
| Icons | Google Material Symbols |

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lookup/{ip}` | IP geolocation lookup |
| GET | `/api/dns/{domain}` | Domain to IP resolution |
| GET | `/api/validate/{ip}` | IP address validation |
| GET | `/api/ping` | Connection ping test |
| GET | `/api/myip` | Get client's public IP |

## 🌙 Dark Mode

The app features a comprehensive CSS variable-based theming system. Toggle dark mode from **Settings → Preferences → Dark Mode**. The preference persists across sessions via localStorage.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ by [Koshal](https://github.com/koshal50)
