import { calculateDistance } from '../db';

describe('calculateDistance (Haversine Formula)', () => {
  describe('Basic Distance Calculations', () => {
    test('should calculate distance between two points correctly', () => {
      // Campo Grande, MS coordinates
      const lat1 = -20.4697;
      const lon1 = -54.6201;
      
      // Point approximately 111m north
      const lat2 = -20.4707;
      const lon2 = -54.6201;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 111 meters (1 degree latitude ≈ 111km)
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });

    test('should return 0 for same coordinates', () => {
      const lat = -20.4697;
      const lon = -54.6201;
      
      const distance = calculateDistance(lat, lon, lat, lon);
      
      expect(distance).toBe(0);
    });

    test('should calculate distance regardless of point order', () => {
      const lat1 = -20.4697;
      const lon1 = -54.6201;
      const lat2 = -20.4707;
      const lon2 = -54.6201;
      
      const distance1 = calculateDistance(lat1, lon1, lat2, lon2);
      const distance2 = calculateDistance(lat2, lon2, lat1, lon1);
      
      expect(distance1).toBeCloseTo(distance2, 2);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should detect user within 50m radius', () => {
      // Tag location: Sala 101
      const tagLat = -20.4697;
      const tagLon = -54.6201;
      
      // User location: 45m away (approximately)
      const userLat = -20.4701;
      const userLon = -54.6201;
      
      const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
      const radius = 50; // meters
      
      expect(distance).toBeLessThan(radius);
    });

    test('should detect user within 100m radius', () => {
      // Tag location: Auditório
      const tagLat = -20.4697;
      const tagLon = -54.6201;
      
      // User location: 89m away (approximately)
      const userLat = -20.4705;
      const userLon = -54.6201;
      
      const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
      const radius = 100; // meters
      
      expect(distance).toBeLessThan(radius);
    });

    test('should detect user outside 100m radius', () => {
      // Tag location: Campus entrance
      const tagLat = -20.4697;
      const tagLon = -54.6201;
      
      // User location: 200m away (approximately)
      const userLat = -20.4715;
      const userLon = -54.6201;
      
      const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
      const radius = 100; // meters
      
      expect(distance).toBeGreaterThan(radius);
    });

    test('should calculate distance for diagonal movement', () => {
      // Tag location
      const tagLat = -20.4697;
      const tagLon = -54.6201;
      
      // User location: moved both north and east
      const userLat = -20.4705;
      const userLon = -54.6195;
      
      const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
      
      // Should be greater than straight line distance
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(150);
    });
  });

  describe('Edge Cases', () => {
    test('should handle equator coordinates', () => {
      const lat1 = 0;
      const lon1 = 0;
      const lat2 = 0.001;
      const lon2 = 0;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200);
    });

    test('should handle negative coordinates (Southern Hemisphere)', () => {
      // São Paulo, Brazil
      const lat1 = -23.5505;
      const lon1 = -46.6333;
      
      // Rio de Janeiro, Brazil (approximately 360km away)
      const lat2 = -22.9068;
      const lon2 = -43.1729;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 360,000 meters
      expect(distance).toBeGreaterThan(350000);
      expect(distance).toBeLessThan(400000);
    });

    test('should handle coordinates near poles', () => {
      // Near North Pole
      const lat1 = 89.9;
      const lon1 = 0;
      const lat2 = 89.9;
      const lon2 = 180;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      expect(distance).toBeGreaterThan(0);
    });

    test('should handle very small distances (< 1m)', () => {
      const lat1 = -20.4697;
      const lon1 = -54.6201;
      
      // Move 0.00001 degrees (approximately 1 meter)
      const lat2 = -20.46971;
      const lon2 = -54.6201;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2);
    });

    test('should handle large distances (> 1000km)', () => {
      // Campo Grande, MS
      const lat1 = -20.4697;
      const lon1 = -54.6201;
      
      // São Paulo, SP (approximately 900km away)
      const lat2 = -23.5505;
      const lon2 = -46.6333;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 900,000 meters
      expect(distance).toBeGreaterThan(850000);
      expect(distance).toBeLessThan(950000);
    });
  });

  describe('Precision Tests', () => {
    test('should return precise distance for known coordinates', () => {
      // Using known coordinates with verified distance
      // London to Paris (approximately 344km)
      const londonLat = 51.5074;
      const londonLon = -0.1278;
      const parisLat = 48.8566;
      const parisLon = 2.3522;
      
      const distance = calculateDistance(londonLat, londonLon, parisLat, parisLon);
      
      // Should be approximately 344,000 meters
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(350000);
    });

    test('should maintain precision for decimal coordinates', () => {
      const lat1 = -20.469712345;
      const lon1 = -54.620134567;
      const lat2 = -20.469812345;
      const lon2 = -54.620134567;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should calculate even with high precision coordinates
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20);
    });
  });

  describe('Check-in Proximity Scenarios', () => {
    describe('50m radius (classroom)', () => {
      const radius = 50;
      const tagLat = -20.4697;
      const tagLon = -54.6201;

      test('should allow check-in at 30m', () => {
        const userLat = -20.4700;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should allow check-in at 49m', () => {
        const userLat = -20.4701;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should reject check-in at 60m', () => {
        const userLat = -20.4702;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeGreaterThan(radius);
      });
    });

    describe('100m radius (auditorium)', () => {
      const radius = 100;
      const tagLat = -20.4697;
      const tagLon = -54.6201;

      test('should allow check-in at 50m', () => {
        const userLat = -20.4701;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should allow check-in at 89m', () => {
        const userLat = -20.4705;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should reject check-in at 150m', () => {
        const userLat = -20.4710;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeGreaterThan(radius);
      });
    });

    describe('200m radius (campus)', () => {
      const radius = 200;
      const tagLat = -20.4697;
      const tagLon = -54.6201;

      test('should allow check-in at 100m', () => {
        const userLat = -20.4706;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should allow check-in at 180m', () => {
        const userLat = -20.4713;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeLessThan(radius);
      });

      test('should reject check-in at 250m', () => {
        const userLat = -20.4719;
        const userLon = -54.6201;
        const distance = calculateDistance(tagLat, tagLon, userLat, userLon);
        
        expect(distance).toBeGreaterThan(radius);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should calculate distance quickly', () => {
      const lat1 = -20.4697;
      const lon1 = -54.6201;
      const lat2 = -20.4707;
      const lon2 = -54.6201;
      
      const startTime = Date.now();
      
      // Calculate 1000 times
      for (let i = 0; i < 1000; i++) {
        calculateDistance(lat1, lon1, lat2, lon2);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calculations in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle batch calculations efficiently', () => {
      const tagLat = -20.4697;
      const tagLon = -54.6201;
      
      // Simulate 100 users
      const users = Array.from({ length: 100 }, (_, i) => ({
        lat: tagLat + (Math.random() - 0.5) * 0.01,
        lon: tagLon + (Math.random() - 0.5) * 0.01,
      }));
      
      const startTime = Date.now();
      
      const distances = users.map(user =>
        calculateDistance(tagLat, tagLon, user.lat, user.lon)
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should process 100 users in less than 50ms
      expect(duration).toBeLessThan(50);
      expect(distances).toHaveLength(100);
      distances.forEach(distance => {
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
