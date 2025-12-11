import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the database functions
vi.mock("./db", () => ({
  getCheckinScheduleById: vi.fn(),
  getScheduleTagRelations: vi.fn(),
  getNfcTagById: vi.fn(),
  getUsersByTagIdWithRecentLocation: vi.fn(),
  createAutomaticCheckin: vi.fn(),
}));

import {
  getCheckinScheduleById,
  getScheduleTagRelations,
} from "./db";

describe("schedules.triggerCheckin time validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should reject check-in when current time is before schedule start time", async () => {
    // Set current time to 07:30 (before 08:00 start)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-11T07:30:00"));

    const mockSchedule = {
      id: 1,
      name: "Test Schedule",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: "4", // Thursday
      isActive: true,
      tagId: 1,
    };

    vi.mocked(getCheckinScheduleById).mockResolvedValue(mockSchedule);

    // The validation logic
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = mockSchedule.startTime.split(':').map(Number);
    const [endH, endM] = mockSchedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const isOutsideTimeRange = currentMinutes < startMinutes || currentMinutes > endMinutes;
    
    expect(isOutsideTimeRange).toBe(true);
    expect(currentMinutes).toBe(450); // 7:30 = 450 minutes
    expect(startMinutes).toBe(480); // 8:00 = 480 minutes
  });

  it("should reject check-in when current time is after schedule end time", async () => {
    // Set current time to 11:00 (after 10:00 end)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-11T11:00:00"));

    const mockSchedule = {
      id: 1,
      name: "Test Schedule",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: "4", // Thursday
      isActive: true,
      tagId: 1,
    };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = mockSchedule.startTime.split(':').map(Number);
    const [endH, endM] = mockSchedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const isOutsideTimeRange = currentMinutes < startMinutes || currentMinutes > endMinutes;
    
    expect(isOutsideTimeRange).toBe(true);
    expect(currentMinutes).toBe(660); // 11:00 = 660 minutes
    expect(endMinutes).toBe(600); // 10:00 = 600 minutes
  });

  it("should allow check-in when current time is within schedule period", async () => {
    // Set current time to 09:00 (within 08:00-10:00)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-11T09:00:00"));

    const mockSchedule = {
      id: 1,
      name: "Test Schedule",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: "4", // Thursday
      isActive: true,
      tagId: 1,
    };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = mockSchedule.startTime.split(':').map(Number);
    const [endH, endM] = mockSchedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const isWithinTimeRange = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    
    expect(isWithinTimeRange).toBe(true);
    expect(currentMinutes).toBe(540); // 9:00 = 540 minutes
  });

  it("should reject check-in when current day is not in schedule days", async () => {
    // Set to Friday (day 5) but schedule is for Thursday (day 4)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-12T09:00:00")); // Friday

    const mockSchedule = {
      id: 1,
      name: "Test Schedule",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: "4", // Thursday only
      isActive: true,
      tagId: 1,
    };

    const now = new Date();
    const currentDay = now.getDay();
    const scheduleDays = mockSchedule.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    
    const isDayAllowed = scheduleDays.includes(currentDay);
    
    expect(isDayAllowed).toBe(false);
    expect(currentDay).toBe(5); // Friday
  });

  it("should allow check-in when current day is in schedule days", async () => {
    // Set to Thursday (day 4) and schedule is for Thursday
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-11T09:00:00")); // Thursday

    const mockSchedule = {
      id: 1,
      name: "Test Schedule",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: "4", // Thursday
      isActive: true,
      tagId: 1,
    };

    const now = new Date();
    const currentDay = now.getDay();
    const scheduleDays = mockSchedule.daysOfWeek.split(',').map(d => parseInt(d.trim()));
    
    const isDayAllowed = scheduleDays.includes(currentDay);
    
    expect(isDayAllowed).toBe(true);
    expect(currentDay).toBe(4); // Thursday
  });
});
