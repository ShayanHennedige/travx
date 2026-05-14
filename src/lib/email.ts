export async function sendInquiryNotification(inquiry: any) {
  try {
    console.log("Mock sending email notification for inquiry:", inquiry?.inquiry_number);
    // Returning success true to mock the email service
    return { success: true, data: { message: "Mock email sent successfully" } };
  } catch (err) {
    console.error("Email processing error (Unhandled):", err);
    return { success: false, error: err };
  }
}
