// electron/latencyScanner.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dns from 'dns';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

const execAsync = promisify(exec);

// ===================== Interfaces =====================

export interface DNSProvider {
    name: string;
    primary: string;
    secondary: string;
}

export interface DNSBenchmarkResult {
    providerName: string;
    primary: string;
    secondary: string;

    icmpTests: number[];
    dnsTests: number[];
    httpsTests: number[];

    icmpAverage: number;
    dnsAverage: number;
    httpsAverage: number;

    averageLatency: number;

    jitter: number;

    packetLoss: number;

    stabilityScore: number;

    latencyScore: number;

    performanceScore: number;

    timestamp: number;
}

export interface BenchmarkProgress {
    providerName: string;
    primary: string;
    secondary: string;
    status: 'waiting' | 'testing' | 'done' | 'error';
    currentMethod: 'icmp' | 'dns' | 'https' | '';
    currentTestIndex: number;
    totalTestsPerMethod: number;
    progress: number;
    totalProviders: number;
    completedProviders: number;
    result: DNSBenchmarkResult | null;
}

// ===================== Provider List =====================

export const DNS_PROVIDERS: DNSProvider[] = [
    { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1' },
    { name: 'Google DNS', primary: '8.8.8.8', secondary: '8.8.4.4' },
    { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112' },
    { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220' },
    { name: 'AdGuard', primary: '94.140.14.14', secondary: '94.140.15.15' },
    { name: 'NextDNS', primary: '45.90.28.0', secondary: '45.90.30.0' },
    { name: 'ControlD', primary: '76.76.2.0', secondary: '76.76.10.0' },
    { name: 'Mullvad', primary: '194.242.2.2', secondary: '193.19.108.2' },
    { name: 'CleanBrowsing', primary: '185.228.168.9', secondary: '185.228.169.9' },
    { name: 'Alternate DNS', primary: '76.76.19.19', secondary: '76.223.122.150' },
    { name: 'Comodo Secure', primary: '8.26.56.26', secondary: '8.20.247.20' },
    { name: 'DNS.SB', primary: '185.222.222.222', secondary: '45.11.45.11' },
    { name: 'FreeDNS', primary: '37.235.1.174', secondary: '37.235.1.177' },
    { name: 'UncensoredDNS', primary: '91.239.100.100', secondary: '89.233.43.71' },
    { name: 'Yandex DNS', primary: '77.88.8.8', secondary: '77.88.8.1' },
    { name: 'SafeDNS', primary: '195.46.39.39', secondary: '195.46.39.40' },
    { name: 'OpenNIC', primary: '94.247.43.254', secondary: '23.94.60.240' },
];

const ICMP_TIMEOUT = 2000;
const DNS_TIMEOUT = 2000;
const HTTPS_TIMEOUT = 3000;
const MAX_CONCURRENCY = 3;
const TIMEOUT_VALUE = -1; // Sentinel for timeout/failure

// ===================== Test Methods =====================

/**
 * METHOD 1 — ICMP Latency (ping)
 */
async function icmpTest(ip: string): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `ping -n 1 -w ${ICMP_TIMEOUT} ${ip}`,
            { timeout: ICMP_TIMEOUT + 1000, windowsHide: true }
        );

        const match = stdout.match(/time[=<](\d+)/i);
        if (match) return parseInt(match[1], 10);

        if (stdout.includes('<1ms') || stdout.includes('time<1')) return 1;

        // Request timed out or destination unreachable
        if (stdout.includes('timed out') || stdout.includes('unreachable')) {
            return TIMEOUT_VALUE;
        }

        return TIMEOUT_VALUE;
    } catch {
        return TIMEOUT_VALUE;
    }
}

/**
 * METHOD 2 — DNS Query Latency
 */
function dnsQueryTest(dnsServer: string): Promise<number> {
    return new Promise((resolve) => {
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);

        const timeoutId = setTimeout(() => {
            resolve(TIMEOUT_VALUE);
        }, DNS_TIMEOUT);

        const start = performance.now();
        resolver.resolve4('example.com', (err) => {
            clearTimeout(timeoutId);
            if (err) {
                resolve(TIMEOUT_VALUE);
            } else {
                resolve(Math.round(performance.now() - start));
            }
        });
    });
}

/**
 * METHOD 3 — HTTPS Latency
 */
function httpsTest(dnsServer: string): Promise<number> {
    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
            resolve(TIMEOUT_VALUE);
        }, HTTPS_TIMEOUT);

        // First resolve example.com using the DNS server, then make HTTPS request
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);

        const start = performance.now();
        resolver.resolve4('example.com', (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                clearTimeout(timeoutId);
                resolve(TIMEOUT_VALUE);
                return;
            }

            const req = https.request(
                {
                    hostname: addresses[0],
                    port: 443,
                    path: '/',
                    method: 'HEAD',
                    headers: { Host: 'example.com' },
                    timeout: HTTPS_TIMEOUT,
                    rejectUnauthorized: false,
                },
                (res) => {
                    clearTimeout(timeoutId);
                    const elapsed = Math.round(performance.now() - start);
                    res.destroy();
                    resolve(elapsed);
                }
            );

            req.on('error', () => {
                clearTimeout(timeoutId);
                resolve(TIMEOUT_VALUE);
            });

            req.on('timeout', () => {
                req.destroy();
                clearTimeout(timeoutId);
                resolve(TIMEOUT_VALUE);
            });

            req.end();
        });
    });
}

// ===================== Metrics Calculation =====================

function calculateAverage(tests: number[]): number {
    const valid = tests.filter((t) => t !== TIMEOUT_VALUE);
    if (valid.length === 0) return 9999;
    return Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

function calculateJitter(tests: number[]): number {
    const valid = tests.filter((t) => t !== TIMEOUT_VALUE);
    if (valid.length < 2) return 0;

    const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length;
    const variance = valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valid.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
}

function calculatePacketLoss(tests: number[]): number {
    const failures = tests.filter((t) => t === TIMEOUT_VALUE).length;
    return Math.round((failures / tests.length) * 100 * 100) / 100;
}

function calculateStabilityScore(packetLossPercent: number, jitterMs: number): number {
    let score = 100;
    score -= packetLossPercent * 1.5;
    score -= jitterMs * 2;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateLatencyScores(results: DNSBenchmarkResult[]): void {
    const validResults = results.filter((r) => r.averageLatency < 9999);
    if (validResults.length === 0) {
        results.forEach((r) => (r.latencyScore = 0));
        return;
    }

    const bestLatency = Math.min(...validResults.map((r) => r.averageLatency));

    for (const r of results) {
        if (r.averageLatency >= 9999) {
            r.latencyScore = 0;
        } else {
            r.latencyScore = Math.min(100, Math.round((bestLatency / r.averageLatency) * 100));
        }
    }
}

function calculatePerformanceScore(stabilityScore: number, latencyScore: number): number {
    return Math.round(stabilityScore * 0.6 + latencyScore * 0.4);
}

// ===================== Single Provider Benchmark =====================

async function benchmarkProvider(
    provider: DNSProvider,
    testsPerMethod: number,
    onProgress: (method: 'icmp' | 'dns' | 'https', testIndex: number) => void
): Promise<DNSBenchmarkResult> {
    const icmpResults: number[] = [];
    const dnsResults: number[] = [];
    const httpsResults: number[] = [];

    // Run ICMP tests
    for (let i = 0; i < testsPerMethod; i++) {
        onProgress('icmp', i);
        const result = await icmpTest(provider.primary);
        icmpResults.push(result);
    }

    // Run DNS query tests
    for (let i = 0; i < testsPerMethod; i++) {
        onProgress('dns', i);
        const result = await dnsQueryTest(provider.primary);
        dnsResults.push(result);
    }

    // Run HTTPS tests
    for (let i = 0; i < testsPerMethod; i++) {
        onProgress('https', i);
        const result = await httpsTest(provider.primary);
        httpsResults.push(result);
    }

    const icmpAverage = calculateAverage(icmpResults);
    const dnsAverage = calculateAverage(dnsResults);
    const httpsAverage = calculateAverage(httpsResults);

    // Average latency = average of the three method averages
    const validAverages = [icmpAverage, dnsAverage, httpsAverage].filter((a) => a < 9999);
    const averageLatency =
        validAverages.length > 0
            ? Math.round(validAverages.reduce((s, v) => s + v, 0) / validAverages.length * 10) / 10
            : 9999;

    // Jitter: standard deviation of ALL valid test results combined
    const allTests = [...icmpResults, ...dnsResults, ...httpsResults];
    const jitter = calculateJitter(allTests);

    // Packet loss
    const packetLoss = calculatePacketLoss(allTests);

    // Stability score
    const stabilityScore = calculateStabilityScore(packetLoss, jitter);

    return {
        providerName: provider.name,
        primary: provider.primary,
        secondary: provider.secondary,
        icmpTests: icmpResults,
        dnsTests: dnsResults,
        httpsTests: httpsResults,
        icmpAverage,
        dnsAverage,
        httpsAverage,
        averageLatency,
        jitter,
        packetLoss,
        stabilityScore,
        latencyScore: 0, // Calculated after all providers are done
        performanceScore: 0, // Calculated after all providers are done
        timestamp: Date.now(),
    };
}

// ===================== Parallel Scanning Engine =====================

let scanAborted = false;

export function cancelScan(): void {
    scanAborted = true;
}

export async function scanAllDNS(
    testsPerMethod: number,
    onProgress: (progress: BenchmarkProgress) => void
): Promise<DNSBenchmarkResult[]> {
    scanAborted = false;
    const totalProviders = DNS_PROVIDERS.length;
    const results: DNSBenchmarkResult[] = [];
    let completedProviders = 0;

    // Initialize all providers as waiting
    for (const provider of DNS_PROVIDERS) {
        onProgress({
            providerName: provider.name,
            primary: provider.primary,
            secondary: provider.secondary,
            status: 'waiting',
            currentMethod: '',
            currentTestIndex: 0,
            totalTestsPerMethod: testsPerMethod,
            progress: 0,
            totalProviders,
            completedProviders: 0,
            result: null,
        });
    }

    // Process providers with concurrency limit
    const queue = [...DNS_PROVIDERS];
    const running: Promise<void>[] = [];

    const processProvider = async (provider: DNSProvider): Promise<void> => {
        if (scanAborted) return;
        // Emit testing status
        onProgress({
            providerName: provider.name,
            primary: provider.primary,
            secondary: provider.secondary,
            status: 'testing',
            currentMethod: 'icmp',
            currentTestIndex: 0,
            totalTestsPerMethod: testsPerMethod,
            progress: (completedProviders / totalProviders) * 100,
            totalProviders,
            completedProviders,
            result: null,
        });

        try {
            const result = await benchmarkProvider(
                provider,
                testsPerMethod,
                (method, testIndex) => {
                    onProgress({
                        providerName: provider.name,
                        primary: provider.primary,
                        secondary: provider.secondary,
                        status: 'testing',
                        currentMethod: method,
                        currentTestIndex: testIndex,
                        totalTestsPerMethod: testsPerMethod,
                        progress: (completedProviders / totalProviders) * 100,
                        totalProviders,
                        completedProviders,
                        result: null,
                    });
                }
            );

            results.push(result);
            completedProviders++;

            onProgress({
                providerName: provider.name,
                primary: provider.primary,
                secondary: provider.secondary,
                status: 'done',
                currentMethod: '',
                currentTestIndex: 0,
                totalTestsPerMethod: testsPerMethod,
                progress: (completedProviders / totalProviders) * 100,
                totalProviders,
                completedProviders,
                result,
            });
        } catch {
            completedProviders++;
            const errorResult: DNSBenchmarkResult = {
                providerName: provider.name,
                primary: provider.primary,
                secondary: provider.secondary,
                icmpTests: [],
                dnsTests: [],
                httpsTests: [],
                icmpAverage: 9999,
                dnsAverage: 9999,
                httpsAverage: 9999,
                averageLatency: 9999,
                jitter: 0,
                packetLoss: 100,
                stabilityScore: 0,
                latencyScore: 0,
                performanceScore: 0,
                timestamp: Date.now(),
            };

            results.push(errorResult);

            onProgress({
                providerName: provider.name,
                primary: provider.primary,
                secondary: provider.secondary,
                status: 'error',
                currentMethod: '',
                currentTestIndex: 0,
                totalTestsPerMethod: testsPerMethod,
                progress: (completedProviders / totalProviders) * 100,
                totalProviders,
                completedProviders,
                result: errorResult,
            });
        }
    };

    // Concurrency-limited parallel execution
    let queueIndex = 0;

    const startNext = (): Promise<void> | null => {
        if (queueIndex >= queue.length || scanAborted) return null;
        const provider = queue[queueIndex++];
        const promise = processProvider(provider).then(() => {
            const next = startNext();
            if (next) running.push(next);
        });
        return promise;
    };

    // Start initial batch
    for (let i = 0; i < MAX_CONCURRENCY && i < queue.length; i++) {
        const promise = startNext();
        if (promise) running.push(promise);
    }

    // Wait for all to complete
    await Promise.all(running);

    if (scanAborted) {
        // Return whatever partial results we have
        if (results.length > 0) {
            calculateLatencyScores(results);
            for (const r of results) {
                r.performanceScore = calculatePerformanceScore(r.stabilityScore, r.latencyScore);
            }
            results.sort((a, b) => b.performanceScore - a.performanceScore);
        }
        return results;
    }

    // Calculate latency scores (relative to best)
    calculateLatencyScores(results);

    // Calculate performance scores
    for (const r of results) {
        r.performanceScore = calculatePerformanceScore(r.stabilityScore, r.latencyScore);
    }

    // Sort by performance score (best first)
    results.sort((a, b) => b.performanceScore - a.performanceScore);

    // Save results to storage
    saveScanResults(results);

    return results;
}

// ===================== Storage =====================

function getStoragePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'scan-results.json');
}

export function saveScanResults(results: DNSBenchmarkResult[]): void {
    try {
        const storagePath = getStoragePath();
        const data = {
            timestamp: Date.now(),
            results: results.map((r) => ({
                providerName: r.providerName,
                primary: r.primary,
                secondary: r.secondary,
                averageLatency: r.averageLatency,
                jitter: r.jitter,
                packetLoss: r.packetLoss,
                stabilityScore: r.stabilityScore,
                latencyScore: r.latencyScore,
                performanceScore: r.performanceScore,
                icmpAverage: r.icmpAverage,
                dnsAverage: r.dnsAverage,
                httpsAverage: r.httpsAverage,
                icmpTests: r.icmpTests,
                dnsTests: r.dnsTests,
                httpsTests: r.httpsTests,
                timestamp: r.timestamp,
            })),
        };
        fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Failed to save scan results:', err);
    }
}

export function loadScanResults(): DNSBenchmarkResult[] | null {
    try {
        const storagePath = getStoragePath();
        if (!fs.existsSync(storagePath)) return null;
        const raw = fs.readFileSync(storagePath, 'utf-8');
        const data = JSON.parse(raw);
        return data.results || null;
    } catch {
        return null;
    }
}
