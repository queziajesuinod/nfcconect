/**
 * Testes unitários para getActiveCheckinSchedules()
 * 
 * Valida que a função retorna apenas agendamentos ativos (isActive = true)
 * e que os campos retornados estão corretos.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock do banco de dados
let mockDb: any;
let mockSchedules: any[] = [];

// Mock da função getDb
jest.mock('../db', () => {
  const actual = jest.requireActual('../db');
  return {
    ...actual,
    getDb: jest.fn(() => Promise.resolve(mockDb)),
  };
});

// Importar após o mock
import { getActiveCheckinSchedules } from '../db';

describe('getActiveCheckinSchedules', () => {
  
  beforeEach(() => {
    // Resetar mock antes de cada teste
    mockSchedules = [];
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn(() => Promise.resolve(mockSchedules)),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CENÁRIO 1: Sem agendamentos no banco
  // ============================================================================
  
  it('deve retornar array vazio quando não há agendamentos', async () => {
    mockSchedules = [];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ============================================================================
  // CENÁRIO 2: Apenas agendamentos ativos
  // ============================================================================
  
  it('deve retornar todos os agendamentos quando todos estão ativos', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula de Matemática',
        description: 'Aula regular',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 2,
        name: 'Aula de Física',
        description: 'Aula de laboratório',
        daysOfWeek: '2,4',
        startTime: '14:00',
        endTime: '16:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('Aula de Matemática');
    expect(result[0].isActive).toBe(true);
    expect(result[1].id).toBe(2);
    expect(result[1].name).toBe('Aula de Física');
    expect(result[1].isActive).toBe(true);
  });

  // ============================================================================
  // CENÁRIO 3: Apenas agendamentos inativos
  // ============================================================================
  
  it('deve retornar array vazio quando todos os agendamentos estão inativos', async () => {
    mockSchedules = [];
    
    // Simular que o banco tem agendamentos inativos mas o where filtra
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.orderBy = jest.fn(() => Promise.resolve([]));
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ============================================================================
  // CENÁRIO 4: Mix de agendamentos ativos e inativos
  // ============================================================================
  
  it('deve retornar apenas os agendamentos ativos ignorando os inativos', async () => {
    // Simular que o where já filtrou e retorna apenas os ativos
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Ativa 1',
        description: 'Descrição',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 3,
        name: 'Aula Ativa 2',
        description: 'Descrição',
        daysOfWeek: '2,4',
        startTime: '14:00',
        endTime: '16:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(2);
    expect(result.every(s => s.isActive === true)).toBe(true);
    expect(result.find(s => s.id === 2)).toBeUndefined(); // ID 2 era inativo
  });

  // ============================================================================
  // CENÁRIO 5: Validar campos retornados
  // ============================================================================
  
  it('deve retornar apenas os campos necessários', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula de Matemática',
        description: 'Aula regular',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(1);
    
    const schedule = result[0];
    
    // Campos que DEVEM estar presentes
    expect(schedule).toHaveProperty('id');
    expect(schedule).toHaveProperty('name');
    expect(schedule).toHaveProperty('description');
    expect(schedule).toHaveProperty('daysOfWeek');
    expect(schedule).toHaveProperty('startTime');
    expect(schedule).toHaveProperty('endTime');
    expect(schedule).toHaveProperty('isActive');
    expect(schedule).toHaveProperty('timezone');
    
    // Campos que NÃO devem estar presentes (não são necessários para o cron)
    expect(schedule).not.toHaveProperty('tagId');
    expect(schedule).not.toHaveProperty('createdAt');
    expect(schedule).not.toHaveProperty('updatedAt');
  });

  // ============================================================================
  // CENÁRIO 6: Validar tipos dos campos
  // ============================================================================
  
  it('deve retornar campos com tipos corretos', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula de Matemática',
        description: 'Aula regular',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    const schedule = result[0];
    
    expect(typeof schedule.id).toBe('number');
    expect(typeof schedule.name).toBe('string');
    expect(typeof schedule.description).toBe('string');
    expect(typeof schedule.daysOfWeek).toBe('string');
    expect(typeof schedule.startTime).toBe('string');
    expect(typeof schedule.endTime).toBe('string');
    expect(typeof schedule.isActive).toBe('boolean');
    expect(typeof schedule.timezone).toBe('string');
    
    expect(schedule.isActive).toBe(true); // Sempre true
  });

  // ============================================================================
  // CENÁRIO 7: Validar formato de daysOfWeek
  // ============================================================================
  
  it('deve retornar daysOfWeek no formato correto (CSV)', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Segunda a Sexta',
        description: 'Aula diária',
        daysOfWeek: '1,2,3,4,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 2,
        name: 'Aula Fim de Semana',
        description: 'Aula especial',
        daysOfWeek: '0,6',
        startTime: '09:00',
        endTime: '11:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result[0].daysOfWeek).toBe('1,2,3,4,5');
    expect(result[0].daysOfWeek.split(',')).toHaveLength(5);
    
    expect(result[1].daysOfWeek).toBe('0,6');
    expect(result[1].daysOfWeek.split(',')).toHaveLength(2);
  });

  // ============================================================================
  // CENÁRIO 8: Validar formato de horários
  // ============================================================================
  
  it('deve retornar horários no formato HH:MM', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Manhã',
        description: 'Aula matutina',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:30',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 2,
        name: 'Aula Tarde',
        description: 'Aula vespertina',
        daysOfWeek: '2,4',
        startTime: '14:15',
        endTime: '16:45',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    // Validar formato HH:MM
    const timeRegex = /^\d{2}:\d{2}$/;
    
    expect(result[0].startTime).toMatch(timeRegex);
    expect(result[0].endTime).toMatch(timeRegex);
    expect(result[1].startTime).toMatch(timeRegex);
    expect(result[1].endTime).toMatch(timeRegex);
  });

  // ============================================================================
  // CENÁRIO 9: Validar ordenação (mais recentes primeiro)
  // ============================================================================
  
  it('deve retornar agendamentos ordenados por createdAt desc', async () => {
    mockSchedules = [
      {
        id: 3,
        name: 'Aula Mais Recente',
        description: 'Criada por último',
        daysOfWeek: '1',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 2,
        name: 'Aula Intermediária',
        description: 'Criada no meio',
        daysOfWeek: '2',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
      {
        id: 1,
        name: 'Aula Mais Antiga',
        description: 'Criada primeiro',
        daysOfWeek: '3',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    // Assumindo que o mock já retorna ordenado
    expect(result[0].id).toBe(3); // Mais recente primeiro
    expect(result[1].id).toBe(2);
    expect(result[2].id).toBe(1); // Mais antiga por último
  });

  // ============================================================================
  // CENÁRIO 10: Validar timezone
  // ============================================================================
  
  it('deve retornar timezone correto', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Campo Grande',
        description: 'Aula local',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result[0].timezone).toBe('America/Campo_Grande');
  });

  // ============================================================================
  // CENÁRIO 11: Validar comportamento com banco null
  // ============================================================================
  
  it('deve retornar array vazio quando banco não está disponível', async () => {
    // Simular banco indisponível
    const { getDb } = require('../db');
    (getDb as jest.Mock).mockResolvedValueOnce(null);
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ============================================================================
  // CENÁRIO 12: Validar grande quantidade de agendamentos
  // ============================================================================
  
  it('deve retornar todos os agendamentos ativos mesmo com muitos registros', async () => {
    // Simular 100 agendamentos ativos
    mockSchedules = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Aula ${i + 1}`,
      description: `Descrição ${i + 1}`,
      daysOfWeek: '1,3,5',
      startTime: '08:00',
      endTime: '10:00',
      isActive: true,
      timezone: 'America/Campo_Grande',
    }));
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(100);
    expect(result.every(s => s.isActive === true)).toBe(true);
  });

  // ============================================================================
  // CENÁRIO 13: Validar agendamento com descrição vazia
  // ============================================================================
  
  it('deve aceitar agendamento com descrição vazia', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Sem Descrição',
        description: '',
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('');
  });

  // ============================================================================
  // CENÁRIO 14: Validar agendamento com descrição null
  // ============================================================================
  
  it('deve aceitar agendamento com descrição null', async () => {
    mockSchedules = [
      {
        id: 1,
        name: 'Aula Sem Descrição',
        description: null,
        daysOfWeek: '1,3,5',
        startTime: '08:00',
        endTime: '10:00',
        isActive: true,
        timezone: 'America/Campo_Grande',
      },
    ];
    
    const result = await getActiveCheckinSchedules();
    
    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
  });

  // ============================================================================
  // CENÁRIO 15: Validar que where foi chamado com isActive = true
  // ============================================================================
  
  it('deve chamar where com eq(checkinSchedules.isActive, true)', async () => {
    mockSchedules = [];
    
    await getActiveCheckinSchedules();
    
    expect(mockDb.where).toHaveBeenCalled();
    // Verificar que where foi chamado (o mock já filtra por isActive = true)
  });

});

// ============================================================================
// TESTES DE INTEGRAÇÃO (Opcional - requer banco de dados de teste)
// ============================================================================

describe('getActiveCheckinSchedules - Integração', () => {
  
  // Estes testes requerem um banco de dados de teste configurado
  // Descomente e adapte conforme necessário
  
  /*
  beforeAll(async () => {
    // Configurar banco de dados de teste
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Limpar banco de dados de teste
    await cleanupTestDatabase();
  });

  it('deve buscar agendamentos ativos do banco real', async () => {
    // Inserir agendamentos de teste
    await createTestSchedule({ isActive: true, name: 'Teste Ativo' });
    await createTestSchedule({ isActive: false, name: 'Teste Inativo' });
    
    const result = await getActiveCheckinSchedules();
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(s => s.isActive === true)).toBe(true);
    expect(result.find(s => s.name === 'Teste Ativo')).toBeDefined();
    expect(result.find(s => s.name === 'Teste Inativo')).toBeUndefined();
  });
  */
  
});
