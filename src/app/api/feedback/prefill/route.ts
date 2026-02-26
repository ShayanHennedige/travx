import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get inquiry/itinerary data for pre-filling feedback form
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const token = searchParams.get("token");
  const reference = searchParams.get("reference");
  const inquiryId = searchParams.get("inquiry_id");
  const itineraryId = searchParams.get("itinerary_id");
  const tourId = searchParams.get("tour_id");
  const groupInquiryId = searchParams.get("group_inquiry_id");

  // If reference number is provided, look up the inquiry first
  let effectiveInquiryId = inquiryId;
  let effectiveGroupInquiryId = groupInquiryId;
  let referenceTourId: string | null = null;
  let referenceItineraryId: string | null = null;

  if (reference) {
    // Try individual inquiry first
    const { data: individualInquiry } = await supabase
      .from("inquiries")
      .select("id")
      .eq("inquiry_number", reference.trim())
      .single();

    if (individualInquiry) {
      effectiveInquiryId = individualInquiry.id;
      // Find itinerary for this inquiry
      const { data: itinerary } = await supabase
        .from("itineraries")
        .select("id")
        .eq("inquiry_id", individualInquiry.id)
        .single();

      if (itinerary) {
        referenceItineraryId = itinerary.id;
        // Find tour for this itinerary
        const { data: tour } = await supabase
          .from("tours")
          .select("id")
          .eq("itinerary_id", itinerary.id)
          .single();

        if (tour) {
          referenceTourId = tour.id;
        }
      }
    } else {
      // Try group inquiry
      const { data: groupInquiry } = await supabase
        .from("group_inquiries")
        .select("id")
        .eq("inquiry_number", reference.trim())
        .single();

      if (groupInquiry) {
        effectiveGroupInquiryId = groupInquiry.id;
        // Find itinerary for this group inquiry
        const { data: itinerary } = await supabase
          .from("itineraries")
          .select("id")
          .eq("group_inquiry_id", groupInquiry.id)
          .single();

        if (itinerary) {
          referenceItineraryId = itinerary.id;
          // Find tour for this itinerary
          const { data: tour } = await supabase
            .from("tours")
            .select("id")
            .eq("itinerary_id", itinerary.id)
            .single();

          if (tour) {
            referenceTourId = tour.id;
          }
        }
      } else {
        return NextResponse.json(
          { error: "Could not find inquiry with this reference number" },
          { status: 404 }
        );
      }
    }
  }

  // If token is provided, validate and extract IDs
  let tokenRecord: any = null;
  let tokenInquiryId: string | null = null;
  let tokenGroupInquiryId: string | null = null;
  let tokenItineraryId: string | null = null;
  let tokenTourId: string | null = null;
  let tokenId: string | null = null;

  if (token) {
    const { data: record, error: tokenError } = await supabase
      .from("feedback_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !record) {
      return NextResponse.json(
        { error: "Invalid or expired feedback token" },
        { status: 401 }
      );
    }

    tokenRecord = record;

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Feedback token has expired" },
        { status: 401 }
      );
    }

    // Check if token has already been used
    if (tokenRecord.used_at) {
      return NextResponse.json(
        { error: "This feedback link has already been used" },
        { status: 401 }
      );
    }

    // Use IDs from token
    tokenInquiryId = tokenRecord.inquiry_id;
    tokenGroupInquiryId = tokenRecord.group_inquiry_id;
    tokenItineraryId = tokenRecord.itinerary_id;
    tokenTourId = tokenRecord.tour_id;
    tokenId = tokenRecord.id;
  }

  try {
    let customerData: any = null;
    let hotels: string[] = [];
    let driverData: any = null;
    let vehicleData: any = null;
    let effectiveTourId = tourId || tokenTourId || referenceTourId || null;
    let effectiveItineraryId = itineraryId || tokenItineraryId || referenceItineraryId || null;
    // Use reference-looked-up IDs if available
    effectiveInquiryId = effectiveInquiryId || inquiryId || tokenInquiryId || null;
    effectiveGroupInquiryId = effectiveGroupInquiryId || groupInquiryId || tokenGroupInquiryId || null;

    // Try to get data from tour first (most complete)
    if (effectiveTourId) {
      const { data: tour, error: tourError } = await supabase
        .from("tours")
        .select(`
          *,
          driver_id,
          itineraries (
            id,
            content,
            inquiry_id,
            group_inquiry_id
          ),
          inquiries (
            id,
            first_name,
            last_name,
            client_email,
            country
          ),
          group_inquiries (
            id,
            head_first_name,
            head_last_name,
            client_email,
            head_client_email,
            country
          ),
          drivers (
            id,
            name,
            contact_number,
            vehicle_type,
            vehicle_number
          )
        `)
        .eq("id", effectiveTourId)
        .single();

      if (tourError) {
        console.error("Error fetching tour:", tourError);
      }

      // Extract hotels from itinerary (exclude last day - departure day)
      if (tour?.itineraries) {
        const itinerary = Array.isArray(tour.itineraries) ? tour.itineraries[0] : tour.itineraries;
        let content = itinerary.content;

        // Parse content if it's a string
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch (e) {
            console.error("Error parsing itinerary content:", e);
          }
        }

        if (content?.days && Array.isArray(content.days)) {
          const hotelSet = new Set<string>();
          // Exclude the last day (departure day - no overnight stay)
          const daysWithHotels = content.days.slice(0, -1);
          daysWithHotels.forEach((day: any) => {
            if (day.hotel_suggestion && day.hotel_suggestion.trim()) {
              hotelSet.add(day.hotel_suggestion.trim());
            }
          });
          hotels = Array.from(hotelSet);
        }
      }

      // If hotels still empty and we have itinerary_id, try fetching directly
      if (hotels.length === 0 && effectiveItineraryId) {
        const { data: itinerary } = await supabase
          .from("itineraries")
          .select("content")
          .eq("id", effectiveItineraryId)
          .single();

        if (itinerary?.content) {
          let content = itinerary.content;
          if (typeof content === 'string') {
            try {
              content = JSON.parse(content);
            } catch (e) {
              console.error("Error parsing itinerary content:", e);
            }
          }

          if (content?.days && Array.isArray(content.days)) {
            const hotelSet = new Set<string>();
            const daysWithHotels = content.days.slice(0, -1);
            daysWithHotels.forEach((day: any) => {
              if (day.hotel_suggestion && day.hotel_suggestion.trim()) {
                hotelSet.add(day.hotel_suggestion.trim());
              }
            });
            hotels = Array.from(hotelSet);
          }
        }
      }

      // Get customer data
      if (tour?.inquiries) {
        const inquiry = tour.inquiries as any;
        let fullName = "";
        if (inquiry.client_name) {
          fullName = inquiry.client_name;
        } else if (inquiry.first_name || inquiry.last_name) {
          fullName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();
        }

        customerData = {
          name: fullName,
          email: inquiry.client_email || "",
          country: inquiry.country || inquiry.client_nationality || null,
          inquiry_id: inquiry.id,
          group_inquiry_id: null,
          type: "individual",
        };
      } else if (tour?.group_inquiries) {
        const groupInquiry = tour.group_inquiries as any;
        customerData = {
          name: `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim(),
          email: groupInquiry.client_email || groupInquiry.head_client_email || "",
          country: groupInquiry.country || null,
          inquiry_id: null,
          group_inquiry_id: groupInquiry.id,
          type: "group",
        };
      }

      // Get driver and vehicle data
      // Debug: Log tour object to see what we have
      console.log("Tour object:", JSON.stringify(tour, null, 2));
      console.log("Tour driver_id:", (tour as any)?.driver_id);
      console.log("Tour drivers nested:", tour?.drivers);

      // Check if nested drivers query returned data
      if (tour?.drivers) {
        const driver = Array.isArray(tour.drivers) ? tour.drivers[0] : tour.drivers;
        console.log("Found driver from nested query:", driver);
        if (driver) {
          driverData = {
            id: driver.id,
            name: driver.name,
            vehicle_type: driver.vehicle_type,
            vehicle_number: driver.vehicle_number,
          };
          vehicleData = {
            type: driver.vehicle_type,
            number: driver.vehicle_number,
          };
        }
      }

      // If driver not found from nested query, try direct lookup by driver_id
      if (!driverData) {
        const driverId = (tour as any)?.driver_id;
        console.log("Attempting direct driver fetch with driver_id:", driverId);

        if (driverId) {
          const { data: driver, error: driverError } = await supabase
            .from("drivers")
            .select("id, name, vehicle_type, vehicle_number")
            .eq("id", driverId)
            .single();

          console.log("Direct driver fetch result:", { driver, error: driverError });

          if (driver && !driverError) {
            driverData = {
              id: driver.id,
              name: driver.name,
              vehicle_type: driver.vehicle_type,
              vehicle_number: driver.vehicle_number,
            };
            vehicleData = {
              type: driver.vehicle_type,
              number: driver.vehicle_number,
            };
          }
        }
      }

      // If customer data wasn't found from tour nested query, try direct inquiry lookup
      if (!customerData && effectiveInquiryId) {
        const { data: inquiry } = await supabase
          .from("inquiries")
          .select("*")
          .eq("id", effectiveInquiryId)
          .single();

        if (inquiry) {
          let fullName = "";
          if (inquiry.client_name) {
            fullName = inquiry.client_name;
          } else if (inquiry.first_name || inquiry.last_name) {
            fullName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();
          }

          customerData = {
            name: fullName,
            email: inquiry.client_email || "",
            country: inquiry.country || inquiry.client_nationality || null,
            inquiry_id: inquiry.id,
            group_inquiry_id: null,
            type: "individual",
          };
        }
      }

      // If still no customer data and we have group inquiry ID, try that
      if (!customerData && effectiveGroupInquiryId) {
        const { data: groupInquiry } = await supabase
          .from("group_inquiries")
          .select("*")
          .eq("id", effectiveGroupInquiryId)
          .single();

        if (groupInquiry) {
          customerData = {
            name: `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim(),
            email: groupInquiry.client_email || groupInquiry.head_client_email || "",
            country: groupInquiry.country || null,
            inquiry_id: null,
            group_inquiry_id: groupInquiry.id,
            type: "group",
          };
        }
      }
    }
    // Try itinerary next
    else if (effectiveItineraryId) {
      const { data: itinerary } = await supabase
        .from("itineraries")
        .select(`
          *,
          inquiries (
            id,
            first_name,
            last_name,
            client_email,
            country
          ),
          group_inquiries (
            id,
            head_first_name,
            head_last_name,
            client_email,
            head_client_email,
            country
          )
        `)
        .eq("id", effectiveItineraryId)
        .single();

      if (itinerary) {
        let content = itinerary.content;

        // Parse content if it's a string
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch (e) {
            console.error("Error parsing itinerary content:", e);
          }
        }

        // Extract hotels (exclude last day - departure day)
        if (content?.days && Array.isArray(content.days)) {
          const hotelSet = new Set<string>();
          // Exclude the last day (departure day - no overnight stay)
          const daysWithHotels = content.days.slice(0, -1);
          daysWithHotels.forEach((day: any) => {
            if (day.hotel_suggestion && day.hotel_suggestion.trim()) {
              hotelSet.add(day.hotel_suggestion.trim());
            }
          });
          hotels = Array.from(hotelSet);
        }

        // Get customer data
        if (itinerary.inquiries) {
          const inquiry = itinerary.inquiries as any;
          let fullName = "";
          if (inquiry.client_name) {
            fullName = inquiry.client_name;
          } else if (inquiry.first_name || inquiry.last_name) {
            fullName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();
          }

          customerData = {
            name: fullName,
            email: inquiry.client_email || "",
            country: inquiry.country || inquiry.client_nationality || null,
            inquiry_id: inquiry.id,
            group_inquiry_id: null,
            type: "individual",
          };
        } else if (itinerary.group_inquiries) {
          const groupInquiry = itinerary.group_inquiries as any;
          customerData = {
            name: `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim(),
            email: groupInquiry.client_email || groupInquiry.head_client_email || "",
            country: groupInquiry.country || null,
            inquiry_id: null,
            group_inquiry_id: groupInquiry.id,
            type: "group",
          };
        }
      }
    }
    // Try individual inquiry
    else if (effectiveInquiryId) {
      const { data: inquiry } = await supabase
        .from("inquiries")
        .select("*")
        .eq("id", effectiveInquiryId)
        .single();

      if (inquiry) {
        // Handle both client_name (single field) and first_name/last_name (separate fields)
        let fullName = "";
        if (inquiry.client_name) {
          fullName = inquiry.client_name;
        } else if (inquiry.first_name || inquiry.last_name) {
          fullName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();
        }

        customerData = {
          name: fullName,
          email: inquiry.client_email || "",
          country: inquiry.country || inquiry.client_nationality || null,
          inquiry_id: inquiry.id,
          group_inquiry_id: null,
          type: "individual",
        };
      }
    }
    // Try group inquiry
    else if (effectiveGroupInquiryId) {
      const { data: groupInquiry } = await supabase
        .from("group_inquiries")
        .select("*")
        .eq("id", effectiveGroupInquiryId)
        .single();

      if (groupInquiry) {
        customerData = {
          name: `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim(),
          email: groupInquiry.client_email || groupInquiry.head_client_email || "",
          country: groupInquiry.country || null,
          inquiry_id: null,
          group_inquiry_id: groupInquiry.id,
          type: "group",
        };
      }
    }

    return NextResponse.json({
      customer: customerData,
      hotels: hotels,
      driver: driverData,
      vehicle: vehicleData,
      itinerary_id: effectiveItineraryId || null,
      tour_id: effectiveTourId || null,
      inquiry_id: customerData?.inquiry_id || effectiveInquiryId || null,
      group_inquiry_id: customerData?.group_inquiry_id || effectiveGroupInquiryId || null,
      token_id: tokenId || null,
      is_from_token: !!token,
    });
  } catch (error: any) {
    console.error("Error fetching prefill data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch data" },
      { status: 500 }
    );
  }
}
