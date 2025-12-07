import { Configuration, VPSVirtualMachineApi, DomainsPortfolioApi, DNSZoneApi } from 'hostinger-api-sdk';

const apiKey = process.env.HOSTINGER_API_KEY;

if (!apiKey) {
  console.error('Error: HOSTINGER_API_KEY environment variable is not set');
  console.error('Please set it in your .env.local file or export it in your shell');
  process.exit(1);
}

const config = new Configuration({
  accessToken: apiKey,
});

const vpsApi = new VPSVirtualMachineApi(config);
const domainsApi = new DomainsPortfolioApi(config);
const dnsApi = new DNSZoneApi(config);

async function queryHostinger() {
  try {
    console.log('=== VPS Information ===');
    const vpsResponse = await vpsApi.getVirtualMachinesV1();
    console.log(JSON.stringify(vpsResponse.data, null, 2));

    console.log('\n=== Domain Portfolio ===');
    const domainsResponse = await domainsApi.getDomainListV1();
    console.log(JSON.stringify(domainsResponse.data, null, 2));

    // Get DNS info for jbresearch-llc.com
    console.log('\n=== DNS Zone for jbresearch-llc.com ===');
    try {
      const dnsResponse = await dnsApi.getDNSRecordsV1('jbresearch-llc.com');
      console.log(JSON.stringify(dnsResponse.data, null, 2));
    } catch (err: any) {
      console.log('Error getting DNS zone:', err.message);
    }
  } catch (error: any) {
    console.error('Error querying Hostinger API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Execute the async function and handle any unhandled errors
queryHostinger().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
