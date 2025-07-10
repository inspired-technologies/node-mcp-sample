import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

//initialize our mcp-server
const mcpServer = new McpServer({
  name: "Weather API Service",
  version: "1.0.0",
});

mcpServer.tool(
  "get_weather",
  "Reads weather for a city via web-api",
  {
    city: z.string(),
  },
  async ({ city }) => {
    try {
      const geoResponse = await axios.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        {
          params: { name: city, count: 1 },
        }
      );

      const location = geoResponse.data.results?.[0];

      if (!location) {
        return {
          content: [
            {
              type: "text",
              text: "Sorry, i couldn't find the city. Please ask the user to try again.",
            },
          ],
        };
      }

      const { latitude, longitude, timezone } = location;

      const weatherResponse = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude,
            longitude,
            hourly: "temperature_2m,precipitation,weathercode",
            daily: "temperature_2m,precipitation,weathercode",
            current_weather: true,
            timezone,
          },
        }
      );

      const weather = weatherResponse.data.current_weather;

      const summary = `These are the current weather conditions for ${city}. 
      It's ${weather.temperature} °C outside with a wind-speed of ${weather.windspeed} km/h 
      and a weather-condition (Open-Meteo Weathercode) ${weather.weathercode}`;

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `An error occured while fetching the weather-data for ${city}. Please try again.`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
