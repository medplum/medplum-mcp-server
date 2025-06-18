import {
  concatUrls,
  getStatus,
  normalizeErrorString,
  normalizeOperationOutcome,
} from "@medplum/core";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { asyncWrap } from "./async";
import { getMcpServer } from "./server";

dotenv.config();

const PORT = process.env.PORT || 8104;
const MEDPLUM_BASE_URL =
  process.env.MEDPLUM_BASE_URL || "https://api.medplum.com";

const app = express();
app.use(express.json());

const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>,
};

app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error("Unhandled error", err);
  res.status(500).json({ msg: "Internal Server Error" });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the Medplum MCP Server!");
});

app.get(
  "/.well-known/*splat",
  asyncWrap(async (req: Request, res: Response) => {
    const wellKnownPath = req.path.substring("/.well-known".length);
    const wellKnownBase = concatUrls(MEDPLUM_BASE_URL, ".well-known");
    const targetUrl = concatUrls(wellKnownBase, wellKnownPath);
    console.log(`Proxying request to: ${targetUrl}`);
    const response = await fetch(targetUrl);
    const responseBody = await response.text();
    const contentType = response.headers.get("Content-Type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    res.status(response.status).send(responseBody);
  })
);

async function handleStreamableHttpRequest(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = requireAuth(req, res);
  if (!authReq) {
    return; // Unauthorized
  }

  try {
    const server = getMcpServer();
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
    res.on("close", async () => {
      await transport.close();
      await server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      const outcome = normalizeOperationOutcome(err);
      res.status(getStatus(outcome)).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: normalizeErrorString(err),
        },
        id: null,
      });
    }
  }
}
app.get("/stream", asyncWrap(handleStreamableHttpRequest));
app.post("/stream", asyncWrap(handleStreamableHttpRequest));
app.delete("/stream", asyncWrap(handleStreamableHttpRequest));

// Legacy SSE endpoint for older clients
app.get("/sse", async (req, res) => {
  const authReq = requireAuth(req, res);
  if (!authReq) {
    return; // Unauthorized
  }

  const transport = new SSEServerTransport("/sse", res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  const server = getMcpServer();
  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post("/sse", async (req, res) => {
  const authReq = requireAuth(req, res);
  if (!authReq) {
    return; // Unauthorized
  }

  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

function requireAuth(
  req: Request,
  res: Response
): (Request & { auth: AuthInfo }) | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).send("Unauthorized");
    return undefined;
  }
  const token = authHeader.split(" ")[1];
  const result = req as Partial<Request & { auth: AuthInfo }>;
  result.auth = { clientId: "medplum", scopes: ["openid"], token };
  return result as Request & { auth: AuthInfo };
}

app.listen(PORT);
console.log(`Server is running on http://localhost:${PORT}`);
