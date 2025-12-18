import { getDb } from './db';
import { deviceLinkActivations } from '../drizzle/schema';

/**
 * Debug function to list all device link activations
 * Helps identify if global links (tagId = null) are being saved correctly
 */
export async function debugListAllActivations() {
  const db = await getDb();
  if (!db) {
    console.log('[DEBUG] Database not available');
    return [];
  }

  const activations = await db.select().from(deviceLinkActivations);
  
  console.log('\n' + '='.repeat(80));
  console.log('[DEBUG] ALL DEVICE LINK ACTIVATIONS');
  console.log('='.repeat(80));
  console.log(`Total activations: ${activations.length}`);
  console.log('');
  
  activations.forEach((activation, index) => {
    console.log(`[${index + 1}] Activation:`);
    console.log(`  - Device ID: ${activation.deviceId}`);
    console.log(`  - Tag ID: ${activation.tagId === null ? 'NULL (GLOBAL)' : activation.tagId}`);
    console.log(`  - Link ID: ${activation.linkId}`);
    console.log(`  - Target URL: ${activation.targetUrl}`);
    console.log(`  - Expires At: ${activation.expiresAt}`);
    console.log(`  - Created At: ${activation.createdAt}`);
    console.log('');
  });
  
  console.log('='.repeat(80) + '\n');
  
  return activations;
}

/**
 * Debug function to find activations for a specific device
 */
export async function debugFindActivationsForDevice(deviceId: string) {
  const db = await getDb();
  if (!db) {
    console.log('[DEBUG] Database not available');
    return [];
  }

  const activations = await db
    .select()
    .from(deviceLinkActivations)
    .where(eq => eq(deviceLinkActivations.deviceId, deviceId));
  
  console.log('\n' + '='.repeat(80));
  console.log(`[DEBUG] ACTIVATIONS FOR DEVICE: ${deviceId}`);
  console.log('='.repeat(80));
  console.log(`Total activations: ${activations.length}`);
  console.log('');
  
  activations.forEach((activation, index) => {
    console.log(`[${index + 1}] Activation:`);
    console.log(`  - Tag ID: ${activation.tagId === null ? 'NULL (GLOBAL)' : activation.tagId}`);
    console.log(`  - Link ID: ${activation.linkId}`);
    console.log(`  - Target URL: ${activation.targetUrl}`);
    console.log(`  - Expires At: ${activation.expiresAt}`);
    console.log(`  - Created At: ${activation.createdAt}`);
    console.log('');
  });
  
  console.log('='.repeat(80) + '\n');
  
  return activations;
}
