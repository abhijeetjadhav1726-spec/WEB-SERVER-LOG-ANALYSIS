// Spark Log Analyzer - Frontend Controller

// Apache Access Log Regex matching ApacheAccessLog.java
const LOG_REGEX = /^(\S+) (\S+) (\S+) \[([\w:\/]+\s[+\-]\d{4})\] "(\S+) (\S+) (\S+)" (\d{3}) (\S+)/;

// Global State
let parsedLogs = [];
let responseCodeChartInstance = null;
let topEndpointsChartInstance = null;
let streamInterval = null;
let streamWindowLogs = [];
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCharts();
    initEventListeners();
    loadDefaultSample();
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            navItems.forEach(n => n.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const targetPanel = document.getElementById(`tab-${tabName}`);
            if (targetPanel) targetPanel.classList.add('active');

            // Update title
            const titles = {
                dashboard: 'Analytics Dashboard',
                explorer: 'Log Explorer',
                streaming: 'Spark Live Streaming Simulator',
                backend: 'Apache Spark Cluster CLI Runner'
            };
            pageTitle.textContent = titles[tabName] || 'Analytics Dashboard';
        });
    });
}

// Chart Initializations
function initCharts() {
    const doughnutCtx = document.getElementById('responseCodeChart');
    if (doughnutCtx) {
        responseCodeChartInstance = new Chart(doughnutCtx, {
            type: 'doughnut',
            data: {
                labels: ['200 OK', '304 Not Modified', '404 Not Found', '301 Moved'],
                datasets: [{
                    data: [1, 1, 1, 1],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12 },
                            padding: 16
                        }
                    }
                }
            }
        });
    }

    const barCtx = document.getElementById('topEndpointsChart');
    if (barCtx) {
        topEndpointsChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Request Hits',
                    data: [],
                    backgroundColor: 'rgba(6, 182, 212, 0.65)',
                    borderColor: '#06b6d4',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 11 } }
                    }
                }
            }
        });
    }
}

// Event Listeners
function initEventListeners() {
    // Sample button
    document.getElementById('btn-load-sample').addEventListener('click', loadDefaultSample);

    // File upload
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            parseAndDisplayLogs(event.target.result);
        };
        reader.readAsText(file);
    });

    // Run Analysis Now
    document.getElementById('btn-analyze-now').addEventListener('click', () => {
        if (parsedLogs.length > 0) {
            updateDashboardMetrics(parsedLogs);
            alert(`Analysis complete for ${parsedLogs.length} logs!`);
        } else {
            loadDefaultSample();
        }
    });

    // Explorer search & filter
    const searchInput = document.getElementById('log-search-input');
    searchInput.addEventListener('input', renderExplorerTable);

    const filterPills = document.querySelectorAll('.filter-pills .pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            renderExplorerTable();
        });
    });

    // Streaming controls
    document.getElementById('btn-toggle-stream').addEventListener('click', toggleStream);
    document.getElementById('btn-clear-stream').addEventListener('click', clearStream);

    // Backend spark run
    document.getElementById('btn-run-backend-spark').addEventListener('click', runBackendSpark);
    document.getElementById('btn-clear-term').addEventListener('click', () => {
        document.getElementById('spark-console').textContent = '[Console cleared]\n';
    });
}

// Parsing function
function parseLogLine(line) {
    const match = line.match(LOG_REGEX);
    if (!match) return null;
    return {
        ip: match[1],
        clientIdentd: match[2],
        userId: match[3],
        timestamp: match[4],
        method: match[5],
        endpoint: match[6],
        protocol: match[7],
        responseCode: parseInt(match[8], 10),
        contentSize: match[9] === '-' ? 0 : parseInt(match[9], 10)
    };
}

function parseAndDisplayLogs(rawText) {
    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    parsedLogs = [];

    lines.forEach(line => {
        const parsed = parseLogLine(line);
        if (parsed) parsedLogs.push(parsed);
    });

    updateDashboardMetrics(parsedLogs);
    renderExplorerTable();
}

// Update Dashboard KPIs and Charts
function updateDashboardMetrics(logs) {
    if (!logs || logs.length === 0) return;

    // 1. Total Requests
    document.getElementById('kpi-total-requests').textContent = logs.length.toLocaleString();

    // 2. Content Sizes
    const sizes = logs.map(l => l.contentSize);
    const sumSize = sizes.reduce((a, b) => a + b, 0);
    const avgSize = Math.round(sumSize / sizes.length);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    document.getElementById('kpi-avg-size').textContent = formatBytes(avgSize);
    document.getElementById('kpi-min-size').textContent = `Min: ${formatBytes(minSize)}`;
    document.getElementById('kpi-max-size').textContent = `Max: ${formatBytes(maxSize)}`;

    // 3. Bandwidth
    document.getElementById('kpi-total-bandwidth').textContent = formatBytes(sumSize);
    document.getElementById('kpi-bandwidth-meta').textContent = `${sizes.length} requests analyzed`;

    // 4. Response Codes
    const responseCounts = {};
    logs.forEach(l => {
        responseCounts[l.responseCode] = (responseCounts[l.responseCode] || 0) + 1;
    });

    const statusSuccess = logs.filter(l => l.responseCode >= 200 && l.responseCode < 300).length;
    const successRate = Math.round((statusSuccess / logs.length) * 100);
    document.getElementById('status-success-rate').textContent = `${successRate}% Success (2xx)`;

    // Update Doughnut Chart
    if (responseCodeChartInstance) {
        const labels = Object.keys(responseCounts).map(c => `HTTP ${c}`);
        const data = Object.values(responseCounts);
        responseCodeChartInstance.data.labels = labels;
        responseCodeChartInstance.data.datasets[0].data = data;
        responseCodeChartInstance.update();
    }

    // 5. Top Endpoints
    const endpointCounts = {};
    logs.forEach(l => {
        endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1;
    });

    const sortedEndpoints = Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (topEndpointsChartInstance) {
        topEndpointsChartInstance.data.labels = sortedEndpoints.map(e => e[0]);
        topEndpointsChartInstance.data.datasets[0].data = sortedEndpoints.map(e => e[1]);
        topEndpointsChartInstance.update();
    }

    // 6. IP Addresses > 10 times
    const ipCounts = {};
    logs.forEach(l => {
        ipCounts[l.ip] = (ipCounts[l.ip] || 0) + 1;
    });

    const suspiciousIps = Object.entries(ipCounts).filter(entry => entry[1] > 10);
    document.getElementById('kpi-suspicious-ips').textContent = suspiciousIps.length;

    const ipListContainer = document.getElementById('high-volume-ip-list');
    if (suspiciousIps.length === 0) {
        ipListContainer.innerHTML = '<div class="empty-state">No client exceeded 10 requests in this window.</div>';
    } else {
        ipListContainer.innerHTML = suspiciousIps.map(entry => `
            <div class="ip-row">
                <span class="ip-address">${entry[0]}</span>
                <span class="ip-badge">${entry[1]} requests</span>
            </div>
        `).join('');
    }
}

// Log Explorer Table
function renderExplorerTable() {
    const tbody = document.getElementById('log-table-body');
    const query = document.getElementById('log-search-input').value.toLowerCase();

    let filtered = parsedLogs.filter(log => {
        // Query match
        const matchesQuery = !query || 
            log.ip.toLowerCase().includes(query) ||
            log.endpoint.toLowerCase().includes(query) ||
            log.method.toLowerCase().includes(query) ||
            log.responseCode.toString().includes(query);

        // Filter pill
        if (!matchesQuery) return false;
        if (currentFilter === 'all') return true;
        if (currentFilter === '2xx') return log.responseCode >= 200 && log.responseCode < 300;
        if (currentFilter === '3xx') return log.responseCode >= 300 && log.responseCode < 400;
        if (currentFilter === '4xx') return log.responseCode >= 400 && log.responseCode < 500;
        if (currentFilter === '5xx') return log.responseCode >= 500;
        return true;
    });

    document.getElementById('log-count-display').textContent = `Showing ${filtered.length} of ${parsedLogs.length} logs`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No matching log records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.slice(0, 100).map(log => {
        let badgeClass = 'status-2xx';
        if (log.responseCode >= 300 && log.responseCode < 400) badgeClass = 'status-3xx';
        else if (log.responseCode >= 400 && log.responseCode < 500) badgeClass = 'status-4xx';
        else if (log.responseCode >= 500) badgeClass = 'status-5xx';

        return `
            <tr>
                <td style="color: #38bdf8; font-weight: 500;">${escapeHtml(log.ip)}</td>
                <td>${escapeHtml(log.timestamp)}</td>
                <td><strong style="color: #cbd5e1;">${escapeHtml(log.method)}</strong></td>
                <td><span style="color: #f1f5f9;">${escapeHtml(log.endpoint)}</span></td>
                <td><span class="status-badge ${badgeClass}">${log.responseCode}</span></td>
                <td>${formatBytes(log.contentSize)}</td>
            </tr>
        `;
    }).join('');
}

// Live Streaming Simulation
function toggleStream() {
    const btnText = document.getElementById('stream-btn-text');
    const icon = document.getElementById('stream-icon');

    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
        btnText.textContent = 'Start Live Stream';
        icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
        btnText.textContent = 'Pause Live Stream';
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        startStreamSimulation();
    }
}

function clearStream() {
    streamWindowLogs = [];
    document.getElementById('stream-feed-terminal').innerHTML = 
        '<div class="terminal-line placeholder">Stream cleared. Waiting for events...</div>';
    document.getElementById('stream-window-count').textContent = '0';
    document.getElementById('stream-window-avg').textContent = '0 B';
    document.getElementById('stream-window-ips').textContent = '0';
}

function startStreamSimulation() {
    const sampleIps = ['112.65.201.61', '192.168.1.45', '10.0.0.12', '172.16.0.4', '112.65.201.61', '112.65.201.61'];
    const sampleEndpoints = ['/hello', '/api/v1/users', '/index.html', '/css/styles.css', '/data.tsv', '/dashboard', '/cart'];
    const sampleCodes = [200, 200, 200, 304, 200, 404, 301];

    streamInterval = setInterval(() => {
        const ip = sampleIps[Math.floor(Math.random() * sampleIps.length)];
        const endpoint = sampleEndpoints[Math.floor(Math.random() * sampleEndpoints.length)];
        const code = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
        const size = Math.floor(Math.random() * 5000) + 120;
        const now = new Date().toUTCString();

        const logLine = `${ip} - - [${now}] "GET ${endpoint} HTTP/1.1" ${code} ${size}`;
        const parsed = { ip, endpoint, responseCode: code, contentSize: size, timestamp: now };

        streamWindowLogs.push(parsed);
        if (streamWindowLogs.length > 50) streamWindowLogs.shift();

        // Update stream terminal
        const term = document.getElementById('stream-feed-terminal');
        const placeholder = term.querySelector('.placeholder');
        if (placeholder) placeholder.remove();

        const div = document.createElement('div');
        div.className = 'terminal-line';
        div.textContent = logLine;
        term.prepend(div);

        // Keep last 100 lines
        while (term.children.length > 100) {
            term.removeChild(term.lastChild);
        }

        // Update streaming window stats
        document.getElementById('stream-window-count').textContent = streamWindowLogs.length;
        const totalSize = streamWindowLogs.reduce((acc, l) => acc + l.contentSize, 0);
        document.getElementById('stream-window-avg').textContent = formatBytes(Math.round(totalSize / streamWindowLogs.length));
        const uniqueIps = new Set(streamWindowLogs.map(l => l.ip));
        document.getElementById('stream-window-ips').textContent = uniqueIps.size;
    }, 700);
}

// Backend Spark Runner
async function runBackendSpark() {
    const consoleEl = document.getElementById('spark-console');
    const mode = document.getElementById('spark-mode-select').value;
    consoleEl.textContent = `[Info] Triggering Apache Spark submit for Mode: ${mode}...\n[Info] Launching Java 8 HotSpot + Spark Assembly runtime...\n\n`;

    try {
        const response = await fetch('/api/run-spark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: mode })
        });

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        consoleEl.textContent = data.output || data.message;
        if (data.success) {
            // Re-load sample logs
            loadDefaultSample();
        }
    } catch (err) {
        consoleEl.textContent += `\n[Backend Notice] Could not connect to Python backend server (${err.message}).\n` +
            `To run the native Spark job directly, run either:\n` +
            `  powershell -File .\\run.ps1 -Mode ${mode}\n` +
            `  or python webui\\server.py to enable browser-triggered execution!`;
    }
}

// Default Sample Loader
async function loadDefaultSample() {
    try {
        const res = await fetch('/api/sample');
        if (res.ok) {
            const text = await res.text();
            parseAndDisplayLogs(text);
            return;
        }
    } catch (_) {}

    // Fallback embedded sample
    const sample = `112.65.201.61 - - [21/Jul/2014:10:00:00 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:01 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:02 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:03 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:04 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:05 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:06 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:07 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:08 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:09 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:10 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:11 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:12 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:13 +0000] "GET /hello HTTP/1.1" 200 1231
112.65.201.61 - - [21/Jul/2014:10:00:14 +0000] "GET /hello HTTP/1.1" 200 1231
10.0.0.1 - - [21/Jul/2014:10:00:15 +0000] "GET / HTTP/1.1" 301 0
10.0.0.2 - - [21/Jul/2014:10:00:16 +0000] "GET / HTTP/1.1" 304 500
10.0.0.3 - - [21/Jul/2014:10:00:17 +0000] "GET /com HTTP/1.1" 404 93445
10.0.0.4 - - [21/Jul/2014:10:00:18 +0000] "GET /111111111111111111111111 HTTP/1.1" 404 1500
10.0.0.5 - - [21/Jul/2014:10:00:19 +0000] "GET /logyun-webui/css/font-awesome.css HTTP/1.1" 200 4500
10.0.0.6 - - [21/Jul/2014:10:00:20 +0000] "GET /logyun-webui/css/bootstrap.min.css HTTP/1.1" 200 8900
10.0.0.7 - - [21/Jul/2014:10:00:21 +0000] "GET /logyun-webui/js/bootstrap.js HTTP/1.1" 200 12000
10.0.0.8 - - [21/Jul/2014:10:00:22 +0000] "GET /logyun-webui/css/pages/dashboard.css HTTP/1.1" 200 3200
10.0.0.9 - - [21/Jul/2014:10:00:23 +0000] "GET /logyun-webui/data/data.tsv HTTP/1.1" 200 6700
10.0.0.10 - - [21/Jul/2014:10:00:24 +0000] "GET /logyun-webui/js/d3.v3.min.js HTTP/1.1" 200 15000`;
    parseAndDisplayLogs(sample);
}

// Helpers
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
