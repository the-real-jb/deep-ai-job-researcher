/**
 * Add DNS A Record to Hostinger
 * 
 * This script adds a DNS A record to your Hostinger domain.
 * 
 * Usage:
 *   # Using environment variables
 *   HOSTINGER_API_KEY=xxx VPS_IP_ADDRESS=45.90.109.196 npx tsx scripts/add-dns-record.ts
 * 
 *   # Using command-line argument for IP
 *   HOSTINGER_API_KEY=xxx npx tsx scripts/add-dns-record.ts 45.90.109.196
 * 
 *   # Using defaults (IP: 45.90.109.196, domain: jbresearch-llc.com, subdomain: resume-hunter)
 *   HOSTINGER_API_KEY=xxx npx tsx scripts/add-dns-record.ts
 * 
 * Environment Variables:
 *   HOSTINGER_API_KEY (required) - Your Hostinger API key
 *   VPS_IP_ADDRESS (optional) - VPS IPv4 address (default: 45.90.109.196)
 *   DOMAIN (optional) - Root domain (default: jbresearch-llc.com)
 *   SUBDOMAIN (optional) - Subdomain to create (default: resume-hunter)
 *   DNS_TTL (optional) - TTL in seconds (default: 3600)
 */

import { Configuration, DNSZoneApi } from 'hostinger-api-sdk';

const apiKey = process.env.HOSTINGER_API_KEY;

if (!apiKey) {
  console.error('Error: HOSTINGER_API_KEY environment variable is not set');
  console.error('Please set it in your .env.local file or export it in your shell');
  process.exit(1);
}

// Get configuration from environment variables or command-line arguments
const vpsIpAddress = process.env.VPS_IP_ADDRESS || process.argv[2] || '45.90.109.196';
const domain = process.env.DOMAIN || 'jbresearch-llc.com';
const subdomain = process.env.SUBDOMAIN || 'resume-hunter';
const ttl = parseInt(process.env.DNS_TTL || '3600', 10);

// Validate IP address format
const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
if (!ipRegex.test(vpsIpAddress)) {
  console.error(`Error: Invalid IP address format: ${vpsIpAddress}`);
  console.error('Please provide a valid IPv4 address');
  process.exit(1);
}

const config = new Configuration({
  accessToken: apiKey,
});

const dnsApi = new DNSZoneApi(config);

async function addResumeHunterDNS() {
  try {
    const fullDomain = `${subdomain}.${domain}`;
    console.log(`Adding DNS A record for ${fullDomain}...`);
    console.log(`IP Address: ${vpsIpAddress}`);

    const updateRequest = {
      overwrite: false, // Append, don't delete existing records
      zone: [
        {
          name: subdomain,
          type: 'A' as const,
          ttl: ttl,
          records: [
            {
              content: vpsIpAddress
            }
          ]
        }
      ]
    };

    // First validate the DNS record
    console.log('Validating DNS record...');
    await dnsApi.validateDNSRecordsV1(domain, updateRequest);
    console.log('✓ DNS record is valid');

    // Then update the DNS
    console.log('Updating DNS zone...');
    await dnsApi.updateDNSRecordsV1(domain, updateRequest);
    console.log('✓ DNS A record added successfully!');

    console.log('\nDNS record created:');
    console.log(`  Name: ${fullDomain}`);
    console.log('  Type: A');
    console.log(`  Value: ${vpsIpAddress}`);
    const hours = Math.floor(ttl / 3600);
    console.log(`  TTL: ${ttl} seconds (${hours} hour${hours !== 1 ? 's' : ''})`);
    console.log('\nNote: DNS propagation can take up to 24-48 hours, but usually completes within minutes.');

    // Fetch and display updated DNS records
    console.log('\n=== Updated DNS Zone ===');
    const dnsResponse = await dnsApi.getDNSRecordsV1(domain);
    const newRecords = dnsResponse.data.filter(r => r.name === subdomain);
    console.log(JSON.stringify(newRecords, null, 2));

  } catch (error: any) {
    console.error('Error adding DNS record:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Execute the async function and handle any unhandled errors
addResumeHunterDNS().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
