# Scripts

Utility scripts for managing Hostinger infrastructure.

## Prerequisites

All scripts require the `HOSTINGER_API_KEY` environment variable to be set.

```bash
export HOSTINGER_API_KEY=your_api_key_here
```

Or add it to your `.env.local`:

```env
HOSTINGER_API_KEY=your_api_key_here
```

## Scripts

### `query-hostinger.ts`

Query Hostinger API for VPS, domain, and DNS information.

**Usage:**

```bash
HOSTINGER_API_KEY=xxx npx tsx scripts/query-hostinger.ts
```

**Output:**
- VPS information (IP addresses, specs)
- Domain portfolio
- DNS zone records for jbresearch-llc.com

### `add-dns-record.ts`

Add or update DNS A records for your domain.

**Basic Usage:**

```bash
# Using defaults (IP: 45.90.109.196, domain: jbresearch-llc.com, subdomain: resume-hunter)
HOSTINGER_API_KEY=xxx npx tsx scripts/add-dns-record.ts

# Specify IP address as command-line argument
HOSTINGER_API_KEY=xxx npx tsx scripts/add-dns-record.ts 192.168.1.100

# Use environment variables for full control
HOSTINGER_API_KEY=xxx \
VPS_IP_ADDRESS=45.90.109.196 \
DOMAIN=jbresearch-llc.com \
SUBDOMAIN=resume-hunter \
DNS_TTL=7200 \
npx tsx scripts/add-dns-record.ts
```

**Environment Variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOSTINGER_API_KEY` | ✅ Yes | - | Your Hostinger API key |
| `VPS_IP_ADDRESS` | No | `45.90.109.196` | VPS IPv4 address |
| `DOMAIN` | No | `jbresearch-llc.com` | Root domain name |
| `SUBDOMAIN` | No | `resume-hunter` | Subdomain to create |
| `DNS_TTL` | No | `3600` | TTL in seconds (1 hour) |

**Examples:**

```bash
# Add DNS record for a different subdomain
HOSTINGER_API_KEY=xxx \
SUBDOMAIN=api \
VPS_IP_ADDRESS=45.90.109.196 \
npx tsx scripts/add-dns-record.ts

# Add DNS record with custom TTL (2 hours)
HOSTINGER_API_KEY=xxx \
DNS_TTL=7200 \
npx tsx scripts/add-dns-record.ts

# Add DNS record for a different domain
HOSTINGER_API_KEY=xxx \
DOMAIN=example.com \
SUBDOMAIN=www \
VPS_IP_ADDRESS=192.168.1.100 \
npx tsx scripts/add-dns-record.ts
```

## Security Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Keep API keys in `.env.local`** which is git-ignored
4. The scripts validate IP address format before making API calls
5. The scripts will exit with error code 1 on failure

## Getting Your Hostinger API Key

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com/)
2. Navigate to **API** section
3. Create a new API key or use an existing one
4. Copy the key and set it as an environment variable

## Troubleshooting

### "HOSTINGER_API_KEY environment variable is not set"

Set the API key:

```bash
export HOSTINGER_API_KEY=your_key_here
# Then run the script
```

### "Invalid IP address format"

Ensure you're providing a valid IPv4 address:

```bash
# Good: 45.90.109.196
# Bad: 45.90.109.256 (last octet > 255)
# Bad: not-an-ip
```

### API Rate Limits

If you hit rate limits, wait a few minutes before retrying. The Hostinger API has rate limiting in place.

### DNS Propagation

After adding a DNS record, it may take up to 24-48 hours to propagate globally, though it typically completes within minutes.

Check propagation status:

```bash
dig resume-hunter.jbresearch-llc.com
# or
nslookup resume-hunter.jbresearch-llc.com
# or use: https://dnschecker.org/
```

## Development

These scripts use:
- TypeScript for type safety
- `tsx` for running TypeScript directly
- `hostinger-api-sdk` for API interactions
- Environment variables for configuration

