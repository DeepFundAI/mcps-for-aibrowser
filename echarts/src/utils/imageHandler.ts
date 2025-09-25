import type {
  ImageContent,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import type { EChartsOption } from "echarts";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { isMinIOConfigured, storeBufferToMinIO } from "./minio";
import { renderECharts } from "./render";

/**
 * Image output format
 */
export type ImageOutputFormat = "png" | "svg" | "option";

/**
 * MCP content type - using official MCP SDK types
 * This is a union of official MCP content types for better compatibility
 */
export type MCPContent = ImageContent | TextContent;

/**
 * Image processing result
 */
export interface ImageHandlerResult {
  content: MCPContent[];
}

/**
 * Unified chart image generation method
 * Automatically decides whether to return Base64 image data or MinIO URL based on configuration
 *
 * @param echartsOption ECharts configuration options
 * @param width Image width, default 800
 * @param height Image height, default 600
 * @param theme Theme, default 'default'
 * @param outputType Output type, default 'png'
 * @param toolName Tool name (for debug logging)
 * @returns Unified MCP response content format
 */
export async function generateChartImage(
  echartsOption: EChartsOption,
  width = 800,
  height = 600,
  theme: "default" | "dark" = "default",
  outputType: ImageOutputFormat = "png",
  toolName = "unknown",
): Promise<ImageHandlerResult> {
  // Debug logging
  if (process.env.DEBUG_MCP_ECHARTS) {
    console.error(`[DEBUG] ${toolName} generating chart:`, {
      width,
      height,
      theme,
      outputType,
      optionKeys: Object.keys(echartsOption),
    });
  }

  try {
    // Render chart
    const result = await renderECharts(
      echartsOption,
      width,
      height,
      theme,
      outputType,
    );

    // Determine output type
    const isImage = outputType !== "svg" && outputType !== "option";

    if (!isImage) {
      // SVG or configuration options, return text directly
      const response = {
        content: [
          {
            type: "text" as const,
            text: result as string,
          },
        ],
      };

      if (process.env.DEBUG_MCP_ECHARTS) {
        console.error(`[DEBUG] ${toolName} chart generated successfully:`, {
          contentType: "text",
          textLength: (result as string).length,
        });
      }

      return response;
    }

    // PNG image type
    const buffer = result as Buffer;

    // Check if we're running in SSE mode (has process.env.MCP_SSE_MODE or port 3033)
    const isSSEMode = process.env.MCP_SSE_MODE === 'true' || process.argv.includes('-t') && process.argv.includes('sse');

    if (isSSEMode) {
      try {
        // Save to local charts directory and return URL
        const chartsDir = path.join(process.cwd(), 'charts');

        // Ensure directory exists
        try {
          mkdirSync(chartsDir, { recursive: true });
        } catch {
          // Directory might already exist
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 11);
        const fileName = `chart-${timestamp}-${randomId}.png`;
        const filePath = path.join(chartsDir, fileName);

        // Save file
        writeFileSync(filePath, buffer);

        // Return local URL
        const url = `http://localhost:3033/charts/${fileName}`;

        const response = {
          content: [
            {
              type: "text" as const,
              text: url,
            },
          ],
        };

        if (process.env.DEBUG_MCP_ECHARTS) {
          console.error(`[DEBUG] ${toolName} chart saved locally:`, {
            contentType: "text",
            url: url,
            filePath: filePath,
          });
        }

        return response;
      } catch (localError) {
        if (process.env.DEBUG_MCP_ECHARTS) {
          console.error(
            `[DEBUG] ${toolName} local storage failed, falling back:`,
            {
              error:
                localError instanceof Error
                  ? localError.message
                  : String(localError),
            },
          );
        }
        // Continue to other methods below
      }
    }

    if (isMinIOConfigured()) {
      try {
        // Use MinIO storage, return URL
        const url = await storeBufferToMinIO(buffer, "png", "image/png");

        const response = {
          content: [
            {
              type: "text" as const,
              text: url,
            },
          ],
        };

        if (process.env.DEBUG_MCP_ECHARTS) {
          console.error(`[DEBUG] ${toolName} chart generated successfully:`, {
            contentType: "text",
            url: url,
          });
        }

        return response;
      } catch (minioError) {
        // MinIO failed, log warning and fallback to Base64
        if (process.env.DEBUG_MCP_ECHARTS) {
          console.error(
            `[DEBUG] ${toolName} MinIO storage failed, falling back to Base64:`,
            {
              error:
                minioError instanceof Error
                  ? minioError.message
                  : String(minioError),
            },
          );
        }
        // Continue to Base64 fallback below
      }
    }

    // Fallback to Base64
    const base64Data = buffer.toString("base64");

    const response = {
      content: [
        {
          type: "image" as const,
          data: base64Data,
          mimeType: "image/png",
        },
      ],
    };

    if (process.env.DEBUG_MCP_ECHARTS) {
      console.error(`[DEBUG] ${toolName} chart generated successfully:`, {
        contentType: "image",
        dataLength: base64Data.length,
      });
    }

    return response;
  } catch (error) {
    // Error logging
    if (process.env.DEBUG_MCP_ECHARTS) {
      console.error(`[DEBUG] ${toolName} chart generation failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    throw new Error(
      `Chart rendering failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
