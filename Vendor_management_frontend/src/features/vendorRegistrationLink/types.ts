export type VendorRegistrationLinkStatus = 'pending' | 'submitted' | 'verified' | 'expired';

export interface SubmittedVendorData {
  name: string;
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
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  category?: string;
}

export interface SubmittedVendorDocument {
  type: 'gst_certificate' | 'pan_card' | 'cancelled_cheque' | 'msme_certificate';
  fileName: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export interface VendorRegistrationLink {
  id: string;
  requirementId: string;
  token: string;
  status: VendorRegistrationLinkStatus;
  expiresAt: string;
  submittedData?: SubmittedVendorData;
  submittedDocuments: SubmittedVendorDocument[];
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: string;
}
