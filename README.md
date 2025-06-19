# Medplum MCP Server

Demo MCP server that proxies requests to Medplum, allowing you to use the Model Context Protocol (MCP) with Medplum's FHIR data.

What is [Model Context Protocol (MCP)](https://modelcontextprotocol.org/)?

> MCP is an open protocol that standardizes how applications provide context to LLMs. Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect your devices to various peripherals and accessories, MCP provides a standardized way to connect AI models to different data sources and tools.

## Setup

Create a `.env` file with `MEDPLUM_BASE_URL`:

```
# To use Medplum hosted:
MEDPLUM_BASE_URL=https://api.medplum.com/

# To use a local Medplum server:
MEDPLUM_BASE_URL=http://localhost:8103
```

By default, this MCP proxy server runs on port 8104. You can change the port by setting the `PORT` environment variable in your `.env` file:

```
# Change the port to 5000
PORT=5000
```

## Run dev server

To run the development server, use the following command:

```bash
npm run dev
```

## Run production server

First, build the production server:

```bash
npm run build
```

Then, start the production server:

```bash
nohup node --max-old-space-size=8192 dist/main.cjs &
```

## Testing with MCP Inspector

Start the inspector:

```bash
npx @modelcontextprotocol/inspector
```

### Testing Streamable HTTP

Set "Transport Type" to "Streamable HTTP" (recommended transport).

Set "URL" to the `/stream` path on your server, e.g. `http://localhost:8104/stream`.

### Testing SSE

Set "Transport Type" to "SSE" (required by Claude and ChatGPT).

Set "URL" to the `/sse` path on your server, e.g. `http://localhost:8104/sse`.
