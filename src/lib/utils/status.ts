import { parseISO } from "date-fns";
import { InquiryStatus } from "@/types/database";

/**
 * Dynamically computes the effective status based on current date vs travel dates.
 * It will upgrade statuses like "in_progress", "confirmed", "ongoing", "upcoming" 
 * into their correct temporal status if the dates have started or passed.
 */
export function getEffectiveStatus(
  baseStatus: string, 
  startDateStr: string | null | undefined, 
  endDateStr: string | null | undefined
): string {
  if (baseStatus === "cancelled") return "cancelled";
  
  if (
    baseStatus === "confirmed" || 
    baseStatus === "in_progress" || 
    baseStatus === "upcoming" || 
    baseStatus === "ongoing"
  ) {
    if (endDateStr) {
      const today = new Date();
      
      let endDate: Date;
      try {
        endDate = endDateStr.includes("T") ? parseISO(endDateStr) : new Date(endDateStr);
      } catch (e) {
        return baseStatus;
      }
      
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      if (today > endDate) {
        return "completed";
      } else if (startDateStr) {
        let startDate: Date;
        try {
          startDate = startDateStr.includes("T") ? parseISO(startDateStr) : new Date(startDateStr);
        } catch(e) {
          return baseStatus;
        }
        startDate.setHours(0, 0, 0, 0);
        
        if (today >= startDate && today <= endDate) {
          // Keep naming conventions consistent based on input type
          return ["upcoming", "ongoing", "completed"].includes(baseStatus) ? "ongoing" : "in_progress";
        }
      }
    }
  }
  
  return baseStatus;
}
