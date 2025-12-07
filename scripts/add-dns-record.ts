import { Configuration, DNSZoneApi } from 'hostinger-api-sdk';

const apiKey = process.env.HOSTINGER_API_KEY;

if (!apiKey) {
  console.error('Error: HOSTINGER_API_KEY environment variable is not set');
  console.error('Please set it in your .env.local file or export it in your shell');
  process.exit(1);
}

const config = new Configuration({
  accessToken: apiKey,
});

const dnsApi = new DNSZoneApi(config);

async function addResumeHunterDNS() {
  try {
    console.log('Adding DNS A record for resume-hunter.jbresearch-llc.com...');

    const updateRequest = {
      overwrite: false, // Append, don't delete existing records
      zone: [
        {
          name: 'resume-hunter',
          type: 'A' as const,
          ttl: 3600, // 1 hour
          records: [
            {
              content: '45.90.109.196' // VPS IPv4
            }
          ]
        }
      ]
    };

    // First validate the DNS record
    console.log('Validating DNS record...');
    await dnsApi.validateDNSRecordsV1('jbresearch-llc.com', updateRequest);
    console.log('✓ DNS record is valid');

    // Then update the DNS
    console.log('Updating DNS zone...');
    await dnsApi.updateDNSRecordsV1('jbresearch-llc.com', updateRequest);
    console.log('✓ DNS A record added successfully!');

    console.log('\nDNS record created:');
    console.log('  Name: resume-hunter.jbresearch-llc.com');
    console.log('  Type: A');
    console.log('  Value: 45.90.109.196');
    console.log('  TTL: 3600 seconds (1 hour)');
    console.log('\nNote: DNS propagation can take up to 24-48 hours, but usually completes within minutes.');

    // Fetch and display updated DNS records
    console.log('\n=== Updated DNS Zone ===');
    const dnsResponse = await dnsApi.getDNSRecordsV1('jbresearch-llc.com');
    const resumeHunterRecords = dnsResponse.data.filter(r => r.name === 'resume-hunter');
    console.log(JSON.stringify(resumeHunterRecords, null, 2));

  } catch (error: any) {
    console.error('Error adding DNS record:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

addResumeHunterDNS();
