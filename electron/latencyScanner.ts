// electron/latencyScanner.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dns from 'dns';

const execAsync = promisify(exec);

export interface DNSProvider {
    name: string;
    primaryIP: string;
    secondaryIP: string;
}

export interface ScanProgress {
    provider: string;
    primaryIP: string;
    secondaryIP: string;
    latency: number;
    status: 'testing' | 'done' | 'error';
    progress: number;
    totalProviders: number;
    currentTest: number;
    totalTests: number;
}

export const DNS_PROVIDERS: DNSProvider[] = [
    { name: 'Cloudflare', primaryIP: '1.1.1.1', secondaryIP: '1.0.0.1' },
    { name: 'Google DNS', primaryIP: '8.8.8.8', secondaryIP: '8.8.4.4' },
    { name: 'Quad9', primaryIP: '9.9.9.9', secondaryIP: '149.112.112.112' },
    { name: 'OpenDNS', primaryIP: '208.67.222.222', secondaryIP: '208.67.220.220' },
    { name: 'AdGuard', primaryIP: '94.140.14.14', secondaryIP: '94.140.15.15' },
    { name: 'NextDNS', primaryIP: '45.90.28.0', secondaryIP: '45.90.30.0' },
    { name: 'Control D', primaryIP: '76.76.2.0', secondaryIP: '76.76.10.0' },
    { name: 'Mullvad', primaryIP: '194.242.2.2', secondaryIP: '193.19.108.2' },
    { name: 'CleanBrowsing', primaryIP: '185.228.168.9', secondaryIP: '185.228.169.9' },
    { name: 'Alternate DNS', primaryIP: '76.76.19.19', secondaryIP: '76.223.122.150' },
];

/**
 * Ping a single IP address and return the latency in ms.
 * Falls back to DNS resolution timing if ping fails.
 */
async function pingIP(ip: string): Promise<number> {
    try {
        const { stdout } = await execAsync(`ping -n 1 -w 3000 ${ip}`, { timeout: 5000 });
        // Parse Windows ping output for time=XXms
        const match = stdout.match(/time[=<](\d+)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
        // If ping says <1ms
        if (stdout.includes('<1ms') || stdout.includes('time<1')) {
            return 1;
        }
        throw new Error('Could not parse ping output');
    } catch {
        // Fallback: measure DNS query time
        return measureDNSQuery(ip);
    }
}

/**
 * Measure DNS resolution time using the specified DNS server.
 */
function measureDNSQuery(dnsServer: string): Promise<number> {
    return new Promise((resolve) => {
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);

        const start = performance.now();
        resolver.resolve4('google.com', (err) => {
            const elapsed = Math.round(performance.now() - start);
            if (err) {
                resolve(9999); // Unreachable or error
            } else {
                resolve(elapsed);
            }
        });

        // Timeout after 5 seconds
        setTimeout(() => resolve(9999), 5000);
    });
}

/**
 * Run multiple ping tests on a single IP and return the average latency.
 */
async function benchmarkIP(ip: string, tests: number): Promise<number> {
    const results: number[] = [];
    for (let i = 0; i < tests; i++) {
        const latency = await pingIP(ip);
        results.push(latency);
    }
    // Remove worst result if more than 2 tests
    if (results.length > 2) {
        results.sort((a, b) => a - b);
        results.pop();
    }
    const avg = results.reduce((sum, val) => sum + val, 0) / results.length;
    return Math.round(avg);
}

/**
 * Scan all DNS providers and report progress via callback.
 */
export async function scanAllDNS(
    testsPerServer: number,
    onProgress: (progress: ScanProgress) => void
): Promise<ScanProgress[]> {
    const results: ScanProgress[] = [];
    const totalProviders = DNS_PROVIDERS.length;

    for (let i = 0; i < DNS_PROVIDERS.length; i++) {
        const provider = DNS_PROVIDERS[i];

        // Emit "testing" status
        onProgress({
            provider: provider.name,
            primaryIP: provider.primaryIP,
            secondaryIP: provider.secondaryIP,
            latency: 0,
            status: 'testing',
            progress: ((i) / totalProviders) * 100,
            totalProviders,
            currentTest: i + 1,
            totalTests: testsPerServer,
        });

        try {
            const latency = await benchmarkIP(provider.primaryIP, testsPerServer);

            const result: ScanProgress = {
                provider: provider.name,
                primaryIP: provider.primaryIP,
                secondaryIP: provider.secondaryIP,
                latency,
                status: latency >= 9999 ? 'error' : 'done',
                progress: ((i + 1) / totalProviders) * 100,
                totalProviders,
                currentTest: i + 1,
                totalTests: testsPerServer,
            };

            results.push(result);
            onProgress(result);
        } catch {
            const errorResult: ScanProgress = {
                provider: provider.name,
                primaryIP: provider.primaryIP,
                secondaryIP: provider.secondaryIP,
                latency: 9999,
                status: 'error',
                progress: ((i + 1) / totalProviders) * 100,
                totalProviders,
                currentTest: i + 1,
                totalTests: testsPerServer,
            };
            results.push(errorResult);
            onProgress(errorResult);
        }
    }

    return results;
}
