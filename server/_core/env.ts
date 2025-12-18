import "dotenv/config";

export const ENV = {
  // JWT Configuration
  cookieSecret: process.env.JWT_SECRET ?? "your-secret-key-change-in-production",
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL ?? "",
  dbSchema: process.env.DB_SCHEMA ?? "dev_iecg",
  registrationSecret: process.env.REGISTRATION_SECRET ?? "",
  
  // Application Configuration
  isProduction: process.env.NODE_ENV === "production",
  
  // Check-in by Proximity Configuration
  proximityRadiusMeters: parseInt(process.env.PROXIMITY_RADIUS_METERS ?? "100", 10),
  
  // Manus APIs (for notifications, storage, etc - optional)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Evolution WhatsApp integration
  evoApiUrl: process.env.EVO_API_URL ?? "",
  evoApiKey: process.env.EVO_API_KEY ?? "",
};
