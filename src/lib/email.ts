import { Resend } from "resend";

export async function sendInquiryNotification(inquiry: any) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY is not defined — skipping email notification.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    console.log("Attempting to send email notification for inquiry:", inquiry.inquiry_number);

    const { data, error } = await resend.emails.send({
      from: "TraveX Notifications <onboarding@resend.dev>",
      to: ["dharshan@venomholidays.com"],

      subject: `New Inquiry Received: ${inquiry.inquiry_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #E04344; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">New Inquiry Notification</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Ref: ${inquiry.inquiry_number}</p>
          </div>
          
          <div style="padding: 20px; color: #1e293b; line-height: 1.6;">
            <p>A new inquiry has been submitted through the public form.</p>
            
            <h2 style="font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Profile Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 140px;">Passenger:</td>
                <td style="padding: 8px 0;">${inquiry.head_first_name ? `${inquiry.head_first_name} ${inquiry.head_last_name}` : `${inquiry.first_name} ${inquiry.last_name}`}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Client Email:</td>
                <td style="padding: 8px 0;">${inquiry.client_email || "Not Provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0;">${inquiry.contact_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Region:</td>
                <td style="padding: 8px 0;">${inquiry.country}</td>
              </tr>
              ${inquiry.agent_email ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #E04344;">Travel Agent:</td>
                <td style="padding: 8px 0;">${inquiry.agent_name} (${inquiry.agent_company})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Agent Email:</td>
                <td style="padding: 8px 0;">${inquiry.agent_email}</td>
              </tr>
              ` : ''}
            </table>
            
            <h2 style="font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Trip Parameters</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 140px;">Travel Window:</td>
                <td style="padding: 8px 0;">${inquiry.arriving_date} to ${inquiry.departure_date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Occupancy:</td>
                <td style="padding: 8px 0;">${inquiry.no_of_pax || inquiry.no_of_adults} Adults, ${inquiry.no_of_children || 0} Children</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Hotel Service:</td>
                <td style="padding: 8px 0;">${inquiry.hotel_type} (${inquiry.room_category})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Meal Plan:</td>
                <td style="padding: 8px 0;">${inquiry.meal_plan || "Standard"}</td>
              </tr>
            </table>

            ${inquiry.client_desires ? `
            <h2 style="font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Client Desires</h2>
            <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #E04344; font-style: italic;">
              ${inquiry.client_desires}
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f8fafc; border-radius: 6px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">This inquiry has been logged in the management system.</p>
            </div>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} TraveX Management System
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log("Resend API Success:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Email processing error (Unhandled):", err);
    return { success: false, error: err };
  }
}
