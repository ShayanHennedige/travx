import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinalizeTourButton } from "@/app/itineraries/[id]/FinalizeTourButton";

jest.mock("@/components/AdminPinModal", () => ({
  AdminPinModal: () => null,
}));

describe("FinalizeTourButton", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  it("disables finalize when prerequisites are missing", () => {
    render(
      <FinalizeTourButton
        itineraryId="it-1"
        inquiryId="inq-1"
        groupInquiryId={null}
        clientName="Alex Guest"
        startDate="2026-06-01"
        endDate="2026-06-05"
        paxAdults={2}
        paxChildren={0}
        hasCostingSheet={false}
        hasVouchers={false}
        hasInvoice={false}
      />
    );

    const button = screen.getByRole("button", { name: /finalize tour/i });
    expect(button).toBeDisabled();
  });

  it("posts finalize request after confirmation", async () => {
    const fetchMock = global.fetch as jest.Mock;
    render(
      <FinalizeTourButton
        itineraryId="it-1"
        inquiryId="inq-1"
        groupInquiryId={null}
        clientName="Alex Guest"
        startDate="2026-06-01"
        endDate="2026-06-05"
        paxAdults={2}
        paxChildren={0}
        hasCostingSheet={true}
        hasVouchers={false}
        hasInvoice={true}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /finalize tour/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm & add to tracker/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tours",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
