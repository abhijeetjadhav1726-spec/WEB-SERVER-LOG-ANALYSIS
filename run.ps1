param(
    [string]$Mode = "all", # options: all, rdd, sql, ui
    [string]$LogFile = "access.log"
)

$ErrorActionPreference = "Stop"

# Mode: UI Dashboard
if ($Mode.ToLower() -eq "ui") {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Starting Spark Log Analyzer Web UI Dashboard...         " -ForegroundColor Cyan
    Write-Host " URL: http://127.0.0.1:8888                               " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    python (Join-Path $PSScriptRoot "webui\server.py")
    exit 0
}

# Configuration - Locate Java 8
$JavaHome = $env:JAVA_HOME
$candidateJdk8 = "C:\Program Files\Eclipse Adoptium\jdk-8.0.504.1-hotspot"
if (-not $JavaHome -or -not (Test-Path "$JavaHome\bin\java.exe") -or -not (& "$JavaHome\bin\java.exe" -version 2>&1 | Select-String "1.8")) {
    if (Test-Path $candidateJdk8) {
        $JavaHome = $candidateJdk8
    }
}

# Locate Hadoop Home for Windows winutils
$HadoopHome = $env:HADOOP_HOME
$candidateHadoop = "C:\Users\Abhijeet Jadhav\Downloads\hadoop"
if (-not $HadoopHome -or -not (Test-Path "$HadoopHome\bin\winutils.exe")) {
    if (Test-Path $candidateHadoop) {
        $HadoopHome = $candidateHadoop
    }
}

# Locate Spark Assembly JAR
$candidateSparkDir = "C:\Users\Abhijeet Jadhav\Downloads\spark-1.5.1-bin-hadoop2.6"
$candidateAssembly = Join-Path $candidateSparkDir "lib\spark-assembly-1.5.1-hadoop2.6.0.jar"
$SparkAssembly = if (Test-Path $candidateAssembly) { $candidateAssembly } else { $null }

$ProjectDir = $PSScriptRoot
$JarPath = Join-Path $ProjectDir "target\spark-log-analysis-0.0.1-SNAPSHOT.jar"

# Set Environment Variables
if ($JavaHome) {
    $env:JAVA_HOME = $JavaHome
    $env:Path = "$JavaHome\bin;$env:Path"
}
if ($HadoopHome) {
    $env:HADOOP_HOME = $HadoopHome
    $env:Path = "$HadoopHome\bin;$env:Path"
}
$JavaExe = Join-Path $JavaHome "bin\java.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Apache Spark Web Server Log Analysis Runner        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Java:            $JavaExe" -ForegroundColor Gray
Write-Host "Hadoop Home:     $HadoopHome" -ForegroundColor Gray
Write-Host "Spark Assembly:  $SparkAssembly" -ForegroundColor Gray
Write-Host "Target Jar:      $JarPath" -ForegroundColor Gray
Write-Host "Log File:        $LogFile" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure Jar exists
if (-not (Test-Path $JarPath)) {
    Write-Host "[*] Building project with Maven..." -ForegroundColor Yellow
    mvn clean package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Maven build failed!"
        exit 1
    }
}

# Ensure log file exists
$FullLogPath = if ([System.IO.Path]::IsPathRooted($LogFile)) { $LogFile } else { Join-Path $ProjectDir $LogFile }
if (-not (Test-Path $FullLogPath)) {
    if ($LogFile -eq "access.log") {
        Write-Host "[*] Generating default sample access.log..." -ForegroundColor Yellow
        $sampleLogs = @(
            '112.65.201.61 - - [21/Jul/2014:10:00:00 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:01 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:02 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:03 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:04 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:05 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:06 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:07 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:08 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:09 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:10 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:11 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:12 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:13 +0000] "GET /hello HTTP/1.1" 200 1231',
            '112.65.201.61 - - [21/Jul/2014:10:00:14 +0000] "GET /hello HTTP/1.1" 200 1231',
            '10.0.0.1 - - [21/Jul/2014:10:00:15 +0000] "GET / HTTP/1.1" 301 0',
            '10.0.0.2 - - [21/Jul/2014:10:00:16 +0000] "GET / HTTP/1.1" 304 500',
            '10.0.0.3 - - [21/Jul/2014:10:00:17 +0000] "GET /com HTTP/1.1" 404 93445',
            '10.0.0.4 - - [21/Jul/2014:10:00:18 +0000] "GET /111111111111111111111111 HTTP/1.1" 404 1500',
            '10.0.0.5 - - [21/Jul/2014:10:00:19 +0000] "GET /logyun-webui/css/font-awesome.css HTTP/1.1" 200 4500',
            '10.0.0.6 - - [21/Jul/2014:10:00:20 +0000] "GET /logyun-webui/css/bootstrap.min.css HTTP/1.1" 200 8900',
            '10.0.0.7 - - [21/Jul/2014:10:00:21 +0000] "GET /logyun-webui/js/bootstrap.js HTTP/1.1" 200 12000',
            '10.0.0.8 - - [21/Jul/2014:10:00:22 +0000] "GET /logyun-webui/css/pages/dashboard.css HTTP/1.1" 200 3200',
            '10.0.0.9 - - [21/Jul/2014:10:00:23 +0000] "GET /logyun-webui/data/data.tsv HTTP/1.1" 200 6700',
            '10.0.0.10 - - [21/Jul/2014:10:00:24 +0000] "GET /logyun-webui/js/d3.v3.min.js HTTP/1.1" 200 15000'
        )
        $sampleLogs | Out-File -FilePath $FullLogPath -Encoding utf8
    } else {
        Write-Error "Specified log file not found: '$FullLogPath'. Please provide an existing file path."
        exit 1
    }
}

function Run-LogAnalyzer {
    Write-Host "`n>>> [1/2] Running Spark LogAnalyzer (RDD Mode)..." -ForegroundColor Green
    & $JavaExe "-Dhadoop.home.dir=$HadoopHome" -cp $SparkAssembly `
        org.apache.spark.deploy.SparkSubmit `
        --master "local[*]" `
        --class com.sectong.sparkapacheloganalysis.LogAnalyzer `
        $JarPath $FullLogPath
}

function Run-LogAnalyzerSQL {
    Write-Host "`n>>> [2/2] Running Spark LogAnalyzerSQL (SQL DataFrame Mode)..." -ForegroundColor Green
    & $JavaExe "-Dhadoop.home.dir=$HadoopHome" -cp $SparkAssembly `
        org.apache.spark.deploy.SparkSubmit `
        --master "local[*]" `
        --class com.sectong.sparkapacheloganalysis.LogAnalyzerSQL `
        $JarPath $FullLogPath
}

switch ($Mode.ToLower()) {
    "rdd" {
        Run-LogAnalyzer
    }
    "sql" {
        Run-LogAnalyzerSQL
    }
    default {
        Run-LogAnalyzer
        Run-LogAnalyzerSQL
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "            Spark Log Analysis Finished Successfully!     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
