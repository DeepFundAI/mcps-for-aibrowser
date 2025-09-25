# MCPs for AI Browser

A collection of Model Context Protocol (MCP) servers optimized for AI browser interactions and data visualization.

## Purpose

This repository serves as a centralized collection of MCP servers that enable AI applications to generate visualizations, process data, and interact with various tools through standardized protocols. Each MCP server provides specific capabilities while maintaining compatibility with AI browsers and development tools.

## Available MCPs

### 🎨 mcp-echarts

Generate visual charts using Apache ECharts with AI MCP dynamically for chart generation and data analysis.

**Features:**
- Supports all ECharts features and syntax
- Export to PNG, SVG, and option formats
- MinIO integration for chart storage
- 18+ chart types (bar, line, pie, scatter, heatmap, etc.)
- Lightweight with zero dependencies

**Installation & Setup:**

```bash
cd echarts
npm install
npm run build
```

**HTTP/SSE Launch:**

```bash
# For SSE transport (recommended)
npm run start -- -t sse -p 3033

# For Streamable transport
npm run start -- -t streamable -p 3033
```

**Access URLs:**
- SSE transport: `http://localhost:3033/sse`
- Streamable transport: `http://localhost:3033/mcp`

**Quick Test:**
```bash
curl -X GET http://localhost:3033/sse
```

---

## Contributing

Feel free to contribute additional MCP servers to this collection. Please ensure each MCP follows the standard protocol specifications and includes proper documentation.

## License

MIT License - see individual MCP directories for specific licensing information.