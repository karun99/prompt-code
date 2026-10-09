# PromptPro Challenge Arena

Backend server for the PromptPro Challenge Arena — a platform for prompt engineering challenges and competitions. Built with Express.js, Supabase, Vercel KV/Blob, and serverless-http.

## Structure

- `prompt-code/` — Express server, API routes, database utilities, and static assets

## Getting Started

```bash
cd prompt-code
npm install
npm run dev   # starts Vercel dev server
```

## Environment Variables

Requires Supabase and Vercel KV/Blob credentials (see `server.js` for details).

## MCP server

This application ships a dependency-free [Model Context Protocol](https://modelcontextprotocol.io)
server (`mcp-server/server.mjs`) exposing its core operations to agentic clients.
It speaks JSON-RPC 2.0 over stdio and adds no runtime dependencies.

Add the repository's [`.mcp.json`](.mcp.json) to your MCP client, or run:

```bash
node mcp-server/server.mjs
```

Protocol smoke tests:

```bash
python3 -m unittest discover -s tests -p "test_mcp_server.py" -v
```

See [docs/MCP.md](docs/MCP.md) and [mcp-server/README.md](mcp-server/README.md).
