# Web Server Log Analysis with Apache Spark & Real-Time Web Dashboard

A distributed log analysis engine built with **Apache Spark** (Core, SQL, and Streaming) and a modern **Interactive Web UI Dashboard** for visual inspection, security anomaly detection, and real-time log monitoring.

---

## 🌟 Key Features

- **Distributed Spark RDD Engine (`LogAnalyzer`)**:
  - High-throughput parsing of Apache Common / Combined Access Logs.
  - Computes content size metrics (Average, Minimum, Maximum, and Total Bandwidth).
  - Calculates response code frequency distributions (2xx, 3xx, 4xx, 5xx).
  - Detects high-frequency client IPs (`> 10 requests`) to highlight potential scrapers, bots, or heavy traffic sources.
  - Identifies top accessed endpoints and resources.

- **Spark SQL DataFrame Engine (`LogAnalyzerSQL`)**:
  - Automatically converts RDD records into typed Spark SQL DataFrames.
  - Registers in-memory temporary tables (`logs`) and runs distributed SQL queries.

- **Spark Streaming Engine (`LogAnalyzerStreaming` & `LogAnalyzerKafkaStreaming`)**:
  - Ingests streaming socket feeds and Kafka topics (`apachelog`).
  - Implements sliding window analytics (30-second window, 10-second slide).

- **Modern Interactive Web UI Dashboard**:
  - Dark mode glassmorphism design with responsive KPI cards.
  - Dynamic **Chart.js** visualizations for status codes and top endpoints.
  - **Log Explorer**: Real-time search, method filtering, and HTTP status code filtering.
  - **Live Stream Simulator**: Simulates Spark Streaming with live pipeline logs.
  - **Spark CLI Runner**: Trigger local Spark batch jobs and view stdout / DAG logs directly from the browser.

---

## 📁 Project Structure

```text
WEB-SERVER-LOG-ANALYSIS/
├── src/main/java/com/sectong/sparkapacheloganalysis/
│   ├── ApacheAccessLog.java            # Log parsing regex & POJO
│   ├── Functions.java                  # Spark transformations & reducers
│   ├── LogAnalyzer.java                # Spark RDD batch analysis
│   ├── LogAnalyzerSQL.java             # Spark SQL DataFrame analysis
│   ├── LogAnalyzerStreaming.java       # Spark socket streaming
│   └── LogAnalyzerKafkaStreaming.java  # Spark Kafka stream consumer
├── webui/
│   ├── index.html                      # Modern Dashboard UI
│   ├── styles.css                      # Glassmorphism dark mode CSS
│   ├── app.js                          # Charts & streaming controller
│   └── server.py                       # Lightweight Python API & static server
├── access.log                          # Sample Apache access log
├── pom.xml                             # Maven build & shaded JAR configuration
├── run.ps1                             # Master PowerShell execution script
├── run.bat                             # Batch runner for Windows
├── run-ui.bat                          # Quick shortcut to launch Web Dashboard
└── README.md                           # Documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Java 8 (JDK 1.8)**: Required for Apache Spark 1.5.1 & Scala 2.10.
- **Apache Spark 1.5.1**: Binaries with Hadoop 2.6.
- **Hadoop WinUtils (Windows only)**: `winutils.exe` and `hadoop.dll` under `%HADOOP_HOME%\bin`.
- **Maven 3+**: For compilation and Uber-JAR packaging.
- **Python 3**: For serving the Web UI dashboard.

### 2. Launch the Web UI Dashboard
Launch the dashboard with a single click or command:

```powershell
.\run-ui.bat
# or
powershell -File .\run.ps1 -Mode ui
```

Open your browser at: **`http://127.0.0.1:8888`**

---

### 3. Run Native Spark Jobs from Command Line

```powershell
# Run both RDD & SQL batch jobs on access.log
.\run.ps1

# Run RDD Log Analyzer only
.\run.ps1 -Mode rdd

# Run Spark SQL Log Analyzer only
.\run.ps1 -Mode sql

# Run against a custom log file
.\run.ps1 -LogFile "C:\path\to\your\custom.log"
```

---

## 📊 Sample Output

```text
==========================================================
>>> [1/2] Running Spark LogAnalyzer (RDD Mode)...
==========================================================
Content Size Avg: 5794, Min: 0, Max: 93445
Response code counts: [(200, 21), (304, 1), (404, 2), (301, 1)]
IPAddresses > 10 times: [112.65.201.61]
Top Endpoints: [(/hello, 15), (/, 2), (/com, 1), (/111111111111111111111111, 1), ...]

==========================================================
>>> [2/2] Running Spark LogAnalyzerSQL (SQL DataFrame Mode)...
==========================================================
Content Size Avg: 5794, Min: 0, Max: 93445
Response code counts: [(200, 21), (301, 1), (304, 1), (404, 2)]
IPAddresses > 10 times: [112.65.201.61]
Top Endpoints: [(/hello, 15), (/, 2), ...]
```

---

## 📄 License
This project is licensed under the Apache 2.0 License.
