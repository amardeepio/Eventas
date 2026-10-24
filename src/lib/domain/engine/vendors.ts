import type { DomainPack, Vendor } from "../types";

export function buildVendorChecklist(pack: DomainPack): Vendor[] {
  return pack.vendors.map((vendor) => ({
    id: vendor.id,
    category: vendor.label,
    budgetCategoryId: vendor.budgetCategoryId,
    status: "idea",
    quote: 0,
    notes: "",
    questions: [...vendor.questions],
    redFlags: [...vendor.redFlags],
  }));
}
