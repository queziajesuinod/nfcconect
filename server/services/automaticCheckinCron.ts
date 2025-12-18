import cron from 'node-cron';
import { 
  getActiveCheckinSchedules, 
  isScheduleActive,
  getScheduleTagRelations,
  getUsersByTagIdWithRecentLocation,
  hasUserCheckinForScheduleToday,
  calculateDistance,
  createAutomaticCheckin,
  autoAddUserToScheduleGroups
} from '../db';
import { ENV } from '../_core/env';
import { getAmazonTime } from '../utils/timezone';

type CronJob = ReturnType<typeof cron.schedule>;

// Helper function to get current date/time in Amazon timezone (UTC-4)
// DEPRECATED: Use getAmazonTime() from utils/timezone instead
function getCampoGrandeTime(): Date {
  return getAmazonTime();
}

/**
 * Processa check-ins automáticos para um agendamento específico
 */
async function processScheduleCheckins(scheduleId: number, scheduleName: string) {
  const now = getCampoGrandeTime();
  
  console.log(`[Cron] Processing schedule ${scheduleId} (${scheduleName})...`);
  
  try {
    // Buscar tags do agendamento
    const tagRelations = await getScheduleTagRelations(scheduleId);
    
    if (tagRelations.length === 0) {
      console.log(`[Cron] Schedule ${scheduleId} has no tags, skipping`);
      return { processed: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`[Cron] Found ${tagRelations.length} tags for schedule ${scheduleId}`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Para cada tag
    for (const tagRelation of tagRelations) {
      const tag = {
        id: tagRelation.tagId,
        uid: tagRelation.tagUid,
        name: tagRelation.tagName,
        latitude: tagRelation.tagLatitude,
        longitude: tagRelation.tagLongitude,
        radiusMeters: tagRelation.tagRadiusMeters,
      };
      
      // Usar raio específico da tag, ou fallback para ENV
      const radius = tag.radiusMeters || ENV.proximityRadiusMeters;
      
      if (!tag.latitude || !tag.longitude) {
        console.log(`[Cron] Tag ${tag.uid} has no geolocation, skipping`);
        skippedCount++;
        continue;
      }
      
      // Buscar usuários com localização recente (últimos 30 minutos)
      const usersWithLocation = await getUsersByTagIdWithRecentLocation(tag.id, 30);
      
      if (usersWithLocation.length === 0) {
        console.log(`[Cron] Tag ${tag.uid}: no users with recent location`);
        continue;
      }
      
      console.log(`[Cron] Tag ${tag.uid}: ${usersWithLocation.length} users with recent location`);
      
      // Para cada usuário
      for (const { user, location } of usersWithLocation) {
        try {
          // Verificar se já tem check-in hoje
          const hasCheckin = await hasUserCheckinForScheduleToday(
            scheduleId,
            user.id,
            now
          );
          
          if (hasCheckin) {
            skippedCount++;
            continue;
          }
          
          // Calcular distância
          const distance = calculateDistance(
            parseFloat(location.latitude),
            parseFloat(location.longitude),
            parseFloat(tag.latitude),
            parseFloat(tag.longitude)
          );
          
          const distanceRounded = Math.round(distance);
          const withinRadius = distance <= radius;
          
          // Se dentro do raio, registrar check-in
          if (withinRadius) {
            await createAutomaticCheckin({
              scheduleId: scheduleId,
              nfcUserId: user.id,
              tagId: tag.id,
              userLatitude: location.latitude,
              userLongitude: location.longitude,
              distanceMeters: distanceRounded,
              isWithinRadius: true,
              scheduledDate: now,
              periodStart: '', // Será preenchido pelo banco
              periodEnd: '',   // Será preenchido pelo banco
              checkinTime: now,
              status: 'completed',
              errorMessage: null,
            });
            
            // Auto-associar usuário aos grupos do agendamento
            try {
              await autoAddUserToScheduleGroups(user.id, scheduleId);
            } catch (error) {
              console.warn(`[Cron] Error adding user ${user.id} to groups:`, error);
            }
            
            processedCount++;
            console.log(
              `[Cron] ✅ Check-in registered for ${user.name} at ${tag.uid} ` +
              `(${distanceRounded}m, radius: ${radius}m)`
            );
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`[Cron] Error processing user ${user.id}:`, error);
        }
      }
    }
    
    console.log(
      `[Cron] Schedule ${scheduleId} complete: ` +
      `${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`
    );
    
    return { processed: processedCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error(`[Cron] Error processing schedule ${scheduleId}:`, error);
    return { processed: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Processa todos os agendamentos ativos
 */
async function processAllActiveSchedules() {
  const startTime = Date.now();
  const now = getCampoGrandeTime();
  
  try {
    // Buscar todos os agendamentos ativos
    const activeSchedules = await getActiveCheckinSchedules();
    
    // Se não há agendamentos ativos, não processar
    if (activeSchedules.length === 0) {
      console.log(`[Cron] ${now.toISOString()} - No active schedules, skipping processing`);
      return;
    }
    
    // Verificar se algum agendamento está ativo no momento atual
    const schedulesActiveNow = activeSchedules.filter(schedule => 
      isScheduleActive(schedule, now)
    );
    
    if (schedulesActiveNow.length === 0) {
      console.log(
        `[Cron] ${now.toISOString()} - ` +
        `${activeSchedules.length} schedule(s) found but none active at current time, skipping processing`
      );
      return;
    }
    
    // Há agendamentos ativos no momento, processar
    console.log('='.repeat(80));
    console.log(`[Cron] Starting automatic check-in processing at ${now.toISOString()}`);
    console.log(`[Cron] ${schedulesActiveNow.length} schedule(s) active at current time`);
    console.log('='.repeat(80));
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let schedulesProcessed = 0;
    
    // Processar cada agendamento ativo
    for (const schedule of schedulesActiveNow) {
      
    const result = await processScheduleCheckins(schedule.id, schedule.name || "");
      
      totalProcessed += result.processed;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      schedulesProcessed++;
    }
    
    const duration = Date.now() - startTime;
    
    console.log('='.repeat(80));
    console.log('[Cron] Automatic check-in processing complete');
    console.log(`[Cron] Schedules processed: ${schedulesProcessed}/${schedulesActiveNow.length}`);
    console.log(`[Cron] Check-ins registered: ${totalProcessed}`);
    console.log(`[Cron] Users skipped: ${totalSkipped}`);
    console.log(`[Cron] Errors: ${totalErrors}`);
    console.log(`[Cron] Duration: ${duration}ms`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('[Cron] Fatal error in automatic check-in processing:', error);
  }
}

/**
 * Inicializa o cron job
 */
export function startAutomaticCheckinCron() {
  // Executar a cada 10 minutos: */10 * * * *
  // Formato: minuto hora dia mês dia-da-semana
  const cronExpression = '*/10 * * * *';
  
  console.log('[Cron] Initializing automatic check-in cron job...');
  console.log(`[Cron] Schedule: Every 10 minutes (${cronExpression})`);
  
  // Criar cron job
  const job = cron.schedule(
    cronExpression,
    async () => {
      await processAllActiveSchedules();
    },
    {
      timezone: 'America/Manaus',
    }
  );
  
  console.log('[Cron] Automatic check-in cron job started successfully');
  console.log('[Cron] Next execution will be in 10 minutes');
  
  // Executar imediatamente na inicialização (opcional)
  // Comentar esta linha se não quiser executar na inicialização
  // processAllActiveSchedules().catch(console.error);
  
  return job;
}

/**
 * Para o cron job (para testes ou shutdown)
 */
export function stopAutomaticCheckinCron(job: CronJob) {
  console.log('[Cron] Stopping automatic check-in cron job...');
  job.stop();
  console.log('[Cron] Automatic check-in cron job stopped');
}
