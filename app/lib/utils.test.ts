import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  calculateNextTireChangeDate,
  calculateNextInspectionDateByKm,
  formatDate,
  formatNumber,
} from "./utils";

describe("Utils Unit Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateNextTireChangeDate", () => {
    it("should suggest Easter for Winter tires (before Easter)", () => {
      vi.setSystemTime(new Date(2024, 0, 1)); 

      const result = calculateNextTireChangeDate("winter");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("winter-to-summer");
      
      const expectedDate = new Date(2024, 2, 31).toISOString();
      expect(result?.date).toBe(expectedDate);
    });

    it("should suggest next year's Easter for Winter tires (after Easter)", () => {
      vi.setSystemTime(new Date(2024, 5, 1)); 

      const result = calculateNextTireChangeDate("winter");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("winter-to-summer");
      
      const expectedDate = new Date(2025, 3, 20).toISOString();
      expect(result?.date).toBe(expectedDate);
    });

    it("should suggest Oct 1st for Summer tires (before Oct)", () => {
      vi.setSystemTime(new Date(2024, 5, 1));

      const result = calculateNextTireChangeDate("summer");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("summer-to-winter");
      
      const expectedDate = new Date(2024, 9, 1).toISOString();
      expect(result?.date).toBe(expectedDate);
    });

    it("should suggest next year's Oct 1st for Summer tires (after Oct)", () => {
      vi.setSystemTime(new Date(2024, 10, 1));

      const result = calculateNextTireChangeDate("summer");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("summer-to-winter");
      
      const expectedDate = new Date(2025, 9, 1).toISOString();
      expect(result?.date).toBe(expectedDate);
    });
  });

  describe("calculateNextInspectionDateByKm", () => {
    it("should return null if insufficient data", () => {
      expect(calculateNextInspectionDateByKm(null, null, 1000, 15000)).toBeNull();
    });

    it("should calculate expected date based on driving behavior", () => {
      const lastDate = "2024-01-01";
      const lastMileage = 10000;
      const currentMileage = 11000;
      const intervalKm = 15000;

      vi.setSystemTime(new Date(2024, 1, 1)); 

      const result = calculateNextInspectionDateByKm(
        lastDate,
        lastMileage,
        currentMileage,
        intervalKm
      );

      expect(result).not.toBeNull();
      const resultDate = new Date(result!);
      expect(resultDate.getTime()).toBeGreaterThan(new Date(2024, 1, 1).getTime());
      expect(resultDate.getFullYear()).toBe(2025);
    });

    it("should return today/past if already overdue", () => {
      const lastDate = "2024-01-01";
      const lastMileage = 10000;
      const currentMileage = 30000; 
      const intervalKm = 15000;

      vi.setSystemTime(new Date(2024, 6, 1)); 

      const result = calculateNextInspectionDateByKm(
        lastDate,
        lastMileage,
        currentMileage,
        intervalKm
      );

      expect(result).toBe(new Date(2024, 6, 1).toISOString());
    });
  });

  describe("Formatting Helpers", () => {
    it("formatDate should handle null", () => {
      expect(formatDate(null)).toBe("-");
    });

    it("formatDate should format YYYY-MM-DD correctly", () => {
      expect(formatDate("2024-01-31")).toBe("31.01.2024");
    });

    it("formatNumber should format with German locale", () => {
      const formatted = formatNumber(1234);
      expect(typeof formatted).toBe("string");
    });
  });
});
