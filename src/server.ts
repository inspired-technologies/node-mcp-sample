import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize MCP Server with name and version information
const mcpServer = new McpServer({
  name: "Weather MCP Server",
  version: "1.0.0",
});

// Define a tool "get_weather" for fetching weather data based on city name
mcpServer.tool(
  "get_weather",
  {
    city: z.string(),
  },
  async ({ city }) => {
    try {
      // Geocoding API request to retrieve latitude, longitude, and timezone for given city
      const geoResponse = await axios.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        {
          params: { name: city, count: 1 },
        }
      );

      const location = geoResponse.data.results?.[0];

      // Check if city was found
      if (!location) {
        return {
          content: [
            {
              type: "text",
              text: `Sorry, I couldn't find the city \"${city}\".`,
            },
          ],
        };
      }

      const { latitude, longitude, timezone } = location;

      // Weather API request to fetch current weather conditions
      const weatherResponse = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude,
            longitude,
            hourly: "temperature_2m,precipitation,weathercode",
            daily: "temperature_2m_max,temperature_2m_min,weathercode",
            current_weather: true,
            timezone,
          },
        }
      );

      const weather = weatherResponse.data.current_weather;

      // Create a summary message of the current weather
      const summary = `Current weather conditions in ${city}:
- Temperature: ${weather.temperature}°C
- Wind Speed: ${weather.windspeed} km/h
- Weather Code (OpenMeteo Weathercode): ${weather.weathercode}`;

      return {
        content: [{ type: "text", text: summary }],
      };
    } catch (err) {
      // Handle any errors that occur during API requests
      console.error("Error while requesting weather data.", err);
      return {
        content: [
          {
            type: "text",
            text: "An error occurred while fetching the weather data. Please try again.",
          },
        ],
      };
    }
  }
);

// Connect MCP server via STDIO transport for communication
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
