export const VENDOR_STATUSES = ['active', 'inactive', 'blacklisted'] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export interface BankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
}

// Phase 6 — Vendor Registration. Documents attached when a vendor is registered from an
// Approved Requirement; absent/empty on a manually-created vendor (the pre-existing
// POST /vendors flow, unchanged by Phase 6).
export const VENDOR_DOCUMENT_TYPES = ['gst_certificate', 'pan_card', 'cancelled_cheque', 'msme_certificate'] as const;
export type VendorDocumentType = (typeof VENDOR_DOCUMENT_TYPES)[number];

export interface VendorDocument {
  type: VendorDocumentType;
  fileName: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export const VENDOR_REGISTRATION_STATUSES = ['pending_documents', 'registered'] as const;
export type VendorRegistrationStatus = (typeof VENDOR_REGISTRATION_STATUSES)[number];

export interface Vendor {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  createdById: string;
  createdByName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  state: string;
  district: string;
  city: string;
  country?: string;
  pincode: string;
  bankDetails: BankDetails;
  category: string;
  status: VendorStatus;
  // Phase 6 — all optional; a manually-created vendor never sets any of these.
  documents: VendorDocument[];
  registrationStatus: VendorRegistrationStatus;
  createdFromRequirement?: string;
  createdFromQuotation?: string;
  approvedByDirectorName?: string;
  createdAt: string;
  updatedAt: string;
}
