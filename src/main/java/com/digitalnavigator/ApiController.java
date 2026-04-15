package com.digitalnavigator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ApiController {

    @Value("${ipstack.api.key}")
    private String apiKey;

    @GetMapping("/lookup/{ip}")
    public String lookupIp(@PathVariable String ip) {
        try {
            String urlStr = "http://api.ipstack.com/" + ip + "?access_key=" + apiKey;
            URL url = new URI(urlStr).toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String response = reader.lines().collect(Collectors.joining());
            reader.close();
            return response;
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    @GetMapping("/dns/{domain}")
    public String resolveDns(@PathVariable String domain) {
        try {
            InetAddress[] addresses = InetAddress.getAllByName(domain);
            StringBuilder json = new StringBuilder("{");
            json.append("\"domain\":\"").append(domain).append("\",");
            json.append("\"addresses\":[");
            List<String> ipv4 = new ArrayList<>();
            List<String> ipv6 = new ArrayList<>();
            for (InetAddress addr : addresses) {
                String ip = addr.getHostAddress();
                if (addr instanceof Inet4Address) {
                    ipv4.add("{\"ip\":\"" + ip + "\",\"type\":\"A RECORD\"}");
                } else if (addr instanceof Inet6Address) {
                    ipv6.add("{\"ip\":\"" + ip + "\",\"type\":\"AAAA\"}");
                }
            }
            List<String> all = new ArrayList<>();
            all.addAll(ipv4);
            all.addAll(ipv6);
            json.append(String.join(",", all));
            json.append("],");
            json.append("\"primary\":\"").append(addresses.length > 0 ? addresses[0].getHostAddress() : "").append("\",");
            json.append("\"success\":true}");
            return json.toString();
        } catch (Exception e) {
            return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @GetMapping("/validate/{ip}")
    public String validateIp(@PathVariable String ip) {
        boolean isValidV4 = ip.matches("^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$");
        boolean isValidV6 = ip.matches("^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$") ||
                             ip.matches("^(([0-9a-fA-F]{1,4}:)*)?::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$") ||
                             ip.equals("::1") || ip.equals("::");
        String version = isValidV4 ? "IPv4" : (isValidV6 ? "IPv6" : "Unknown");
        boolean isValid = isValidV4 || isValidV6;
        String type = "Unknown";
        if (isValidV4) {
            if (ip.startsWith("10.") || ip.startsWith("192.168.") ||
                ip.matches("^172\\.(1[6-9]|2[0-9]|3[01])\\..*")) {
                type = "Private";
            } else if (ip.startsWith("127.")) {
                type = "Loopback";
            } else {
                type = "Public";
            }
        } else if (isValidV6) {
            if (ip.equals("::1")) type = "Loopback";
            else if (ip.toLowerCase().startsWith("fe80")) type = "Link-Local";
            else if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) type = "Private";
            else type = "Public";
        }
        return "{\"ip\":\"" + ip + "\",\"valid\":" + isValid + ",\"version\":\"" + version + "\",\"type\":\"" + type + "\"}";
    }

    @GetMapping("/networkinfo")
    public String networkInfo() {
        try {
            String hostname = InetAddress.getLocalHost().getHostName();
            String localIp = InetAddress.getLocalHost().getHostAddress();
            // Get public IP
            String publicIp = "Unknown";
            try {
                URL url = new URI("https://api.ipify.org").toURL();
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                publicIp = reader.readLine();
                reader.close();
            } catch (Exception ignored) {}
            
            // Get geolocation for public IP via ipstack - use the lookup endpoint internally
            String country = "Unknown";
            String city = "Unknown";
            String regionName = "Unknown";
            double latitude = 0;
            double longitude = 0;
            if (!"Unknown".equals(publicIp)) {
                try {
                    URL geoUrl = new URI("http://api.ipstack.com/" + publicIp + "?access_key=" + apiKey).toURL();
                    HttpURLConnection geoConn = (HttpURLConnection) geoUrl.openConnection();
                    geoConn.setConnectTimeout(5000);
                    geoConn.setReadTimeout(5000);
                    BufferedReader geoReader = new BufferedReader(new InputStreamReader(geoConn.getInputStream()));
                    String geoResponse = geoReader.lines().collect(Collectors.joining());
                    geoReader.close();
                    // Robust JSON parsing - handle optional whitespace after colon
                    country = extractJsonStringRobust(geoResponse, "country_name");
                    city = extractJsonStringRobust(geoResponse, "city");
                    regionName = extractJsonStringRobust(geoResponse, "region_name");
                    try { latitude = Double.parseDouble(extractJsonValue(geoResponse, "latitude")); } catch (Exception ignored2) {}
                    try { longitude = Double.parseDouble(extractJsonValue(geoResponse, "longitude")); } catch (Exception ignored2) {}
                } catch (Exception ignored) {}
            }

            // Get network interface info
            String connectionType = "Unknown";
            String interfaceName = "Unknown";
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                while (interfaces.hasMoreElements()) {
                    NetworkInterface ni = interfaces.nextElement();
                    if (ni.isUp() && !ni.isLoopback() && !ni.isVirtual()) {
                        interfaceName = ni.getDisplayName();
                        if (interfaceName.toLowerCase().contains("wi-fi") || interfaceName.toLowerCase().contains("wlan") || interfaceName.toLowerCase().contains("wireless")) {
                            connectionType = "WiFi";
                        } else if (interfaceName.toLowerCase().contains("eth") || interfaceName.toLowerCase().contains("lan")) {
                            connectionType = "Ethernet";
                        } else {
                            connectionType = "Network";
                        }
                        break;
                    }
                }
            } catch (Exception ignored) {}

            return "{\"publicIp\":\"" + publicIp + "\",\"privateIp\":\"" + localIp + 
                   "\",\"hostname\":\"" + hostname + "\",\"connectionType\":\"" + connectionType + 
                   "\",\"interfaceName\":\"" + interfaceName + 
                   "\",\"country\":\"" + country + "\",\"city\":\"" + city + 
                   "\",\"regionName\":\"" + regionName + 
                   "\",\"latitude\":" + latitude + ",\"longitude\":" + longitude + "}";
        } catch (Exception e) {
            return "{\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @GetMapping("/ping/{host}")
    public String pingHost(@PathVariable String host) {
        try {
            InetAddress addr = InetAddress.getByName(host);
            long start = System.currentTimeMillis();
            boolean reachable = addr.isReachable(5000);
            long elapsed = System.currentTimeMillis() - start;
            return "{\"host\":\"" + host + "\",\"reachable\":" + reachable + ",\"latency\":" + elapsed + "}";
        } catch (Exception e) {
            return "{\"host\":\"" + host + "\",\"reachable\":false,\"latency\":-1,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    // Robust JSON string extractor - handles whitespace after colon and null values
    private String extractJsonStringRobust(String json, String key) {
        // Find the key
        String keyPattern = "\"" + key + "\"";
        int keyIdx = json.indexOf(keyPattern);
        if (keyIdx == -1) return "Unknown";
        
        // Move past the key and find the colon
        int colonIdx = json.indexOf(':', keyIdx + keyPattern.length());
        if (colonIdx == -1) return "Unknown";
        
        // Skip whitespace after colon
        int valStart = colonIdx + 1;
        while (valStart < json.length() && Character.isWhitespace(json.charAt(valStart))) valStart++;
        
        if (valStart >= json.length()) return "Unknown";
        
        // Check for null
        if (json.substring(valStart).startsWith("null")) return "Unknown";
        
        // Expect opening quote
        if (json.charAt(valStart) != '"') return "Unknown";
        valStart++; // skip opening quote
        
        // Find closing quote
        int valEnd = json.indexOf('"', valStart);
        if (valEnd == -1) return "Unknown";
        
        String value = json.substring(valStart, valEnd);
        return (value.isEmpty() || "null".equals(value)) ? "Unknown" : value;
    }

    // Helper to extract a JSON string value by key
    private String extractJsonString(String json, String key) {
        // Check for null value first: "key":null
        String nullSearch = "\"" + key + "\":null";
        if (json.contains(nullSearch)) return "Unknown";
        
        String search = "\"" + key + "\":\"";
        int idx = json.indexOf(search);
        if (idx == -1) return "Unknown";
        int start = idx + search.length();
        int end = json.indexOf("\"", start);
        String value = end > start ? json.substring(start, end) : "Unknown";
        return (value == null || value.isEmpty() || "null".equals(value)) ? "Unknown" : value;
    }

    // Helper to extract a JSON raw value (number/boolean) by key
    private String extractJsonValue(String json, String key) {
        String search = "\"" + key + "\":";
        int idx = json.indexOf(search);
        if (idx == -1) return "0";
        int start = idx + search.length();
        int end = start;
        while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
        return json.substring(start, end).trim();
    }
}
