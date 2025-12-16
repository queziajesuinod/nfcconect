export const ENV = {
  // JWT Configuration
  cookieSecret: process.env.JWT_SECRET ?? "your-secret-key-change-in-production",
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL ?? "",
  
  // Application Configuration
  isProduction: process.env.NODE_ENV === "production",
  
  // Manus APIs (for notifications, storage, etc - optional)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
