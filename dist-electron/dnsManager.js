"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDNS = applyDNS;
exports.restoreDNS = restoreDNS;
exports.getSystemDNS = getSystemDNS;
// electron/dnsManager.ts
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Detect the primary active network adapter (Wi-Fi or Ethernet)
 * using netsh (more reliable than PowerShell with quoting issues).
 */
async function getActiveAdapter() {
    // Method 1: Parse netsh interface list for connected adapters
    try {
        const { stdout } = await execAsync('netsh interface show interface', {
            timeout: 10000,
            windowsHide: true,
        });
        const lines = stdout.split(/\r?\n/);
        for (const line of lines) {
            // Lines look like: "Enabled  Connected  Dedicated  Wi-Fi"
            // Columns: Admin State, State, Type, Interface Name
            if (line.includes('Connected') && line.includes('Dedicated')) {
                // Extract interface name (last column, after the 3 fixed-width columns)
                const match = line.match(/Connected\s+Dedicated\s+(.+)/i);
                if (match) {
                    const name = match[1].trim();
                    // Skip virtual/loopback adapters
                    if (!name.toLowerCase().includes('loopback') &&
                        !name.toLowerCase().includes('vethernet') &&
                        !name.toLowerCase().includes('bluetooth')) {
                        return name;
                    }
                }
            }
        }
    }
    catch {
        // Continue to fallbacks
    }
    // Method 2: Try common adapter names directly
    for (const name of ['Wi-Fi', 'Ethernet', 'WiFi', 'Ethernet 2']) {
        try {
            const { stdout } = await execAsync(`netsh interface show interface name="${name}"`, { timeout: 5000, windowsHide: true });
            if (stdout.includes('Connected'))
                return name;
        }
        catch {
            continue;
        }
    }
    // Method 3: PowerShell fallback with proper encoding
    try {
        const psScript = `
            $adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1 -ExpandProperty Name
            Write-Output $adapter
        `;
        const base64 = Buffer.from(psScript, 'utf16le').toString('base64');
        const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64}`, { timeout: 10000, windowsHide: true });
        const adapter = stdout.trim();
        if (adapter)
            return adapter;
    }
    catch {
        // Final fallback failed
    }
    throw new Error('No active network adapter found. Please check your network connection.');
}
/**
 * Get DNS servers for a specific adapter using netsh.
 */
async function getDNSFromNetsh(adapterName) {
    try {
        const { stdout } = await execAsync(`netsh interface ip show dns name="${adapterName}"`, { timeout: 10000, windowsHide: true });
        const lines = stdout.split(/\r?\n/);
        const dnsServers = [];
        let isDHCP = false;
        for (const line of lines) {
            // Check for DHCP
            if (line.toLowerCase().includes('dhcp') || line.toLowerCase().includes('configured through dhcp')) {
                isDHCP = true;
            }
            // Look for IP addresses - lines containing DNS server IPs
            const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch) {
                dnsServers.push(ipMatch[1]);
            }
        }
        return { dns: dnsServers, isDHCP };
    }
    catch {
        return { dns: [], isDHCP: false };
    }
}
/**
 * Get DNS using netsh interface ip show config for the adapter.
 */
async function getDNSFromConfig(adapterName) {
    try {
        const { stdout } = await execAsync(`netsh interface ip show config name="${adapterName}"`, { timeout: 10000, windowsHide: true });
        const lines = stdout.split(/\r?\n/);
        const dnsServers = [];
        let isDHCP = false;
        let inDNSSection = false;
        for (const line of lines) {
            const trimmed = line.trim();
            // Detect DHCP enabled
            if (trimmed.toLowerCase().includes('dhcp enabled') && trimmed.toLowerCase().includes('yes')) {
                isDHCP = true;
            }
            // Detect DNS section
            if (trimmed.toLowerCase().includes('dns server') || trimmed.toLowerCase().includes('dns servers')) {
                inDNSSection = true;
                const ipMatch = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                if (ipMatch) {
                    dnsServers.push(ipMatch[1]);
                }
                continue;
            }
            // Collect additional DNS IPs (they appear on subsequent indented lines)
            if (inDNSSection) {
                const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
                if (ipMatch) {
                    dnsServers.push(ipMatch[1]);
                }
                else if (trimmed.length > 0 && !trimmed.match(/^\d/)) {
                    inDNSSection = false;
                }
            }
        }
        return { dns: dnsServers, isDHCP };
    }
    catch {
        return { dns: [], isDHCP: false };
    }
}
/**
 * Apply DNS settings using elevated PowerShell.
 */
async function applyDNS(primaryIP, secondaryIP) {
    try {
        const adapter = await getActiveAdapter();
        // Build the PowerShell script and encode it to avoid quoting issues
        const psScript = `Set-DnsClientServerAddress -InterfaceAlias '${adapter}' -ServerAddresses ('${primaryIP}','${secondaryIP}')`;
        const innerBase64 = Buffer.from(psScript, 'utf16le').toString('base64');
        // Run the encoded command elevated via Start-Process -Verb RunAs
        const outerScript = `Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${innerBase64}' -Verb RunAs -Wait`;
        const outerBase64 = Buffer.from(outerScript, 'utf16le').toString('base64');
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${outerBase64}`, { timeout: 30000, windowsHide: true });
        // Verify the change
        const verifyInfo = await getSystemDNS();
        const applied = verifyInfo.dns.includes(primaryIP);
        if (applied) {
            return {
                success: true,
                message: `DNS set to ${primaryIP} / ${secondaryIP} on "${adapter}"`,
            };
        }
        else {
            return {
                success: true,
                message: `DNS command executed on "${adapter}". Please verify in Network Settings.`,
            };
        }
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('The operation was canceled')) {
            return {
                success: false,
                message: 'Administrator permission was denied. DNS was not changed.',
            };
        }
        return {
            success: false,
            message: `Failed to apply DNS: ${msg}`,
        };
    }
}
/**
 * Restore DNS to automatic (DHCP) settings.
 */
async function restoreDNS() {
    try {
        const adapter = await getActiveAdapter();
        const psScript = `Set-DnsClientServerAddress -InterfaceAlias '${adapter}' -ResetServerAddresses`;
        const innerBase64 = Buffer.from(psScript, 'utf16le').toString('base64');
        const outerScript = `Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${innerBase64}' -Verb RunAs -Wait`;
        const outerBase64 = Buffer.from(outerScript, 'utf16le').toString('base64');
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${outerBase64}`, { timeout: 30000, windowsHide: true });
        return {
            success: true,
            message: `DNS restored to automatic (DHCP) on "${adapter}"`,
        };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('canceled') || msg.includes('cancelled')) {
            return {
                success: false,
                message: 'Administrator permission was denied. DNS was not changed.',
            };
        }
        return {
            success: false,
            message: `Failed to restore DNS: ${msg}`,
        };
    }
}
/**
 * Get the current system DNS settings.
 */
async function getSystemDNS() {
    try {
        const adapter = await getActiveAdapter();
        // Try netsh dns query first (most reliable, no quoting issues)
        let result = await getDNSFromNetsh(adapter);
        // Fallback to netsh config if dns-specific command didn't return results
        if (result.dns.length === 0) {
            result = await getDNSFromConfig(adapter);
        }
        // Fallback to PowerShell with encoded command
        if (result.dns.length === 0) {
            try {
                const psScript = `Get-DnsClientServerAddress -InterfaceAlias '${adapter}' -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses`;
                const base64 = Buffer.from(psScript, 'utf16le').toString('base64');
                const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64}`, { timeout: 10000, windowsHide: true });
                const servers = stdout
                    .trim()
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0 && /^\d/.test(s));
                if (servers.length > 0) {
                    result = { dns: servers, isDHCP: false };
                }
            }
            catch {
                // PowerShell fallback also failed
            }
        }
        return {
            adapter,
            dns: result.dns.length > 0 ? result.dns : ['Automatic (DHCP)'],
            isDHCP: result.isDHCP || result.dns.length === 0,
        };
    }
    catch (error) {
        return {
            adapter: 'Unknown',
            dns: ['Unable to detect'],
            isDHCP: false,
        };
    }
}
//# sourceMappingURL=dnsManager.js.map