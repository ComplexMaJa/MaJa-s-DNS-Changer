"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DNS_PROVIDERS = void 0;
exports.scanAllDNS = scanAllDNS;
// electron/latencyScanner.ts
const child_process_1 = require("child_process");
const util_1 = require("util");
const dns = __importStar(require("dns"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
exports.DNS_PROVIDERS = [
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
async function pingIP(ip) {
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
    }
    catch {
        // Fallback: measure DNS query time
        return measureDNSQuery(ip);
    }
}
/**
 * Measure DNS resolution time using the specified DNS server.
 */
function measureDNSQuery(dnsServer) {
    return new Promise((resolve) => {
        const resolver = new dns.Resolver();
        resolver.setServers([dnsServer]);
        const start = performance.now();
        resolver.resolve4('google.com', (err) => {
            const elapsed = Math.round(performance.now() - start);
            if (err) {
                resolve(9999); // Unreachable or error
            }
            else {
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
async function benchmarkIP(ip, tests) {
    const results = [];
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
async function scanAllDNS(testsPerServer, onProgress) {
    const results = [];
    const totalProviders = exports.DNS_PROVIDERS.length;
    for (let i = 0; i < exports.DNS_PROVIDERS.length; i++) {
        const provider = exports.DNS_PROVIDERS[i];
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
            const result = {
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
        }
        catch {
            const errorResult = {
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
//# sourceMappingURL=latencyScanner.js.map