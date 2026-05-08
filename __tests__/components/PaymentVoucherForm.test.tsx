import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentVoucherForm } from "@/app/payment-vouchers/[id]/PaymentVoucherForm";

jest.mock("@/components/AdminPinModal", () => ({
  AdminPinModal: () => null,
}));

jest.mock("@/components/VersionHistoryPanel", () => ({
  VersionHistoryPanel: () => null,
}));

describe("PaymentVoucherForm", () => {
  it("auto-calculates totals from nights and rate", () => {
    render(
      <PaymentVoucherForm
        voucher={{
          id: "pv-1",
          voucher_no: "PV-001",
          voucher_date: "2026-05-08",
          tour_reference: "TR-001",
          payee_type: "Hotel",
          payee_name: "Hotel One",
          description: "Stay",
          nights_count: 1,
          rate_usd: 100,
          total_usd: 100,
          exchange_rate: 300,
          total_lkr: 30000,
          voucher_category: "hotel",
        }}
      />
    );

    const nightsInput = screen.getByText("Nights").parentElement?.querySelector("input") as HTMLInputElement;
    const rateInput = screen.getByText("Rate (USD/night)").parentElement?.querySelector("input") as HTMLInputElement;
    const totalUsdInput = screen.getByText("Total (USD)").parentElement?.querySelector("input") as HTMLInputElement;

    fireEvent.change(nightsInput, { target: { value: "2" } });
    fireEvent.change(rateInput, { target: { value: "150" } });

    expect(totalUsdInput.value).toBe("300");
    expect(screen.getByText(/LKR 90,000/)).toBeInTheDocument();
  });
});
