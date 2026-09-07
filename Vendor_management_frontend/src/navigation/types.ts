import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

/** Drawer tabs for the `super_admin` role (tab bar hidden — drawer replaces it). */
export type MainTabParamList = {
  Dashboard: undefined;
  Departments: NavigatorScreenParams<DepartmentsStackParamList> | undefined;
  Users: NavigatorScreenParams<UsersStackParamList> | undefined;
  // Added for drawer navigation — Super Admin can view/manage these via the sidebar.
  Vendors: NavigatorScreenParams<VendorsStackParamList> | undefined;
  // Phase 1 of the Enterprise Procurement Workflow — precedes Quotations in the new flow.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  Quotations: NavigatorScreenParams<QuotationsStackParamList> | undefined;
  Bills: NavigatorScreenParams<BillsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  Reports: undefined;
  Payments: NavigatorScreenParams<PaymentsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/** Bottom tabs for `department_user` (and, for now, any other non-admin role). */
export type DepartmentUserTabParamList = {
  Dashboard: undefined;
  // Both accept nested screen params so the Vendor-registration hand-off (Quotations -> Vendors
  // -> back to Quotations) can deep-link directly into a specific screen of the other tab.
  Vendors: NavigatorScreenParams<VendorsStackParamList> | undefined;
  // Phase 1 of the Enterprise Procurement Workflow — precedes Quotations in the new flow.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  Quotations: NavigatorScreenParams<QuotationsStackParamList> | undefined;
  Bills: NavigatorScreenParams<BillsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  // Read-only "My Payments" — scoped server-side to Payments tied to Bills this Department
  // User created. No process/edit actions ever render for this role.
  Payments: NavigatorScreenParams<PaymentsStackParamList> | undefined;
  Profile: undefined;
};

export type UsersStackParamList = {
  // `initialRoleFilter` lets a deep link (e.g. the Super Admin Dashboard's "CEO Management"
  // Quick Action) land directly on a pre-filtered role, the same hand-off pattern used by
  // `AccountsBillList`'s `initialStatus`.
  UserList: { initialRoleFilter?: import('@/constants/roles').Role } | undefined;
  CreateUser: { departmentId?: string; departmentName?: string } | undefined;
  UserDetails: { userId: string };
  EditUser: { userId: string };
};

export type DepartmentsStackParamList = {
  DepartmentList: undefined;
  DepartmentDetails: { departmentId: string };
  AddDepartment: undefined;
  EditDepartment: { departmentId: string };
};

/** HOD's own Users stack — hits /hod/users, not /users, so it's a separate stack from
 *  UsersStackParamList (Super Admin's). No role/department params — both are always
 *  implicit for an HOD (see hod.service.ts on the backend). */
export type HodUsersStackParamList = {
  UserList: undefined;
  CreateUser: undefined;
  UserDetails: { userId: string };
  EditUser: { userId: string };
};

/** Bottom tabs for the `hod` role — department-wide access to Users, Vendors, Quotations,
 *  Bills, and Purchase Orders (see HodNavigator.tsx). */
export type HodTabParamList = {
  Dashboard: undefined;
  Users: NavigatorScreenParams<HodUsersStackParamList> | undefined;
  Vendors: NavigatorScreenParams<VendorsStackParamList> | undefined;
  // Phase 1 of the Enterprise Procurement Workflow — read-only for HOD (see
  // docs/PHASE1_REQUIREMENT_MODULE.md); precedes Quotations in the new flow.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  Quotations: NavigatorScreenParams<QuotationsStackParamList> | undefined;
  Bills: NavigatorScreenParams<BillsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ChangePassword: undefined;
  // Reachable by every role (route registered once, same shared stack), but the entry
  // point (a row on ProfileScreen) only ever renders for Super Admin.
  SystemSettings: undefined;
  AppSettings: undefined;
  // Generic action-audit trail — entry point renders for Super Admin (sees every department)
  // and HOD (server-scoped to their own department).
  ActivityLog: undefined;
  // Gemini AI verification run log (prompts, tokens, timing) — entry point renders for Super
  // Admin only, matching the backend's `GET /ai-audit-logs` authorization.
  AiAuditLog: undefined;
};

export type VendorsStackParamList = {
  VendorList: undefined;
  VendorDetails: { vendorId: string };
  // `returnTo` is set only when this screen was opened from the "No Active Vendor Found"
  // prompt in Create Quotation — on success we navigate back there instead of just going back.
  AddVendor: { returnTo?: 'quotation' } | undefined;
  EditVendor: { vendorId: string };
};

export type QuotationsStackParamList = {
  QuotationList: undefined;
  QuotationDetails: { quotationId: string };
  CreateQuotation: { autoSelectVendorId?: string } | undefined;
  EditQuotation: { quotationId: string };
};

/** Phase 1 of the Enterprise Procurement Workflow — see docs/PHASE1_REQUIREMENT_MODULE.md.
 *  The new starting point of the workflow, one step before Quotations. */
export type RequirementsStackParamList = {
  // `initialStatus` lets a dashboard KPI/task card (Department User's "In Progress", Director's
  // "Requirements Awaiting Review") land directly on a pre-filtered tab — same hand-off pattern
  // as `AccountsBillList`'s `initialStatus` / `UserList`'s `initialRoleFilter`.
  RequirementList: {
    initialStatus?: import('@/features/requirements/types').RequirementStatus | 'all';
    /** Auto-expand this card's quotations on landing — set when arriving from a notification tap. */
    expandRequirementId?: string;
  } | undefined;
  RequirementDetails: { requirementId: string };
  // In-app PDF viewer (react-native-webview) — replaces handing quotation/invoice attachments
  // off to whatever external app the OS resolves for a PDF URL via Linking.openURL.
  PdfViewer: { url: string; title?: string };
  CreateRequirement: undefined;
  EditRequirement: { requirementId: string };
  CreateRequirementQuotation: { requirementId: string };
  QuotationOcrResult: { requirementId: string; quotationId: string };
  // Phase 4 — AI Comparison Engine. Reads the OCR structured data already stored on each
  // quotation (Phase 3); never re-runs OCR, never approves or finalizes a vendor.
  AiComparison: { requirementId: string };
  // Phase 5 — Director Review & Approval. Read-only for Department User/HOD; Approve/
  // Reject/Send Back are Director/Super Admin only.
  DirectorReview: { requirementId: string; readOnly?: boolean };
  // Phase 6 — Vendor Registration. Only reachable once Requirement.status is approved (or
  // vendor_finalized, to view the result); Department User (own) / Super Admin can create,
  // HOD/Director are read-only.
  VendorRegistration: { requirementId: string };
  // "Show Vendors" — lets the Department User/Super Admin manually pick any existing Vendor
  // for this requirement, instead of only the auto-detected email/phone match or a fresh
  // registration/public link.
  SelectExistingVendor: { requirementId: string };
  // Vendor Public Self-Registration Link — extends Phase 6. Review + "Verify & Finalize" a
  // vendor's own public-form submission; only reachable once a link's status is `submitted`.
  VendorRegistrationLinkVerify: { requirementId: string };
  // Read-only, cross-role timeline of a Requirement's full journey (Requirement -> Quotation/
  // AI Comparison -> Director Approval -> Vendor Registration -> Purchase Order -> Goods
  // Receipt -> Bill -> Payment). No mutations of its own — every row taps through into that
  // stage's own existing detail screen.
  RequirementPipeline: { requirementId: string };
};

export type BillsStackParamList = {
  BillList: undefined;
  BillDetails: { billId: string };
  CreateBill: { quotationId: string };
  EditBill: { billId: string };
  RecurringExpenseList: undefined;
  CreateRecurringExpense: undefined;
  GenerateRecurringCycle: { recurringExpenseId: string; title: string };
  // In-app PDF viewer (react-native-webview) — replaces handing invoice/attachment files off
  // to whatever external app the OS resolves for a PDF URL via Linking.openURL.
  PdfViewer: { url: string; title?: string };
};

export type PurchaseOrderStackParamList = {
  PurchaseOrderList: undefined;
  PurchaseOrderDetails: { purchaseOrderId: string };
  // `quotationId` pre-selects the quotation when navigated to straight from a just-Approved
  // Quotation's "Generate Purchase Order" CTA (see QuotationDetailsScreen.tsx) — optional so
  // the FAB entry point on PurchaseOrderListScreen keeps working with a blank picker.
  // `requirementId` (Phase 7) instead auto-resolves the registered Vendor/winning Quotation
  // from a vendor_finalized Requirement — mutually exclusive with quotationId.
  CreatePurchaseOrder: { quotationId?: string; requirementId?: string } | undefined;
  ComparisonScreen: { purchaseOrderId: string };
  // Phase 8 — recorded once per Purchase Order; mandatory before a Bill can be created only
  // when the PO is Requirement-originated (see docs/PHASE8_GOODS_RECEIPT.md).
  RecordGoodsReceipt: { purchaseOrderId: string };
  // Standalone browse/search list for Goods Receipts — previously only viewable embedded
  // inside a single Purchase Order's own detail screen. Read-only; a sibling stack screen
  // reachable from PurchaseOrderList's header, so every role with a `PurchaseOrders` tab
  // gets it for free.
  GoodsReceiptList: undefined;
};

/** Shared by Payment Department (full actions), Accounts/Super Admin (read-only), and
 *  Department User (read-only "My Payments") — action buttons are gated client-side by role,
 *  and re-enforced server-side regardless (see payment.routes.ts authorize() calls). Never
 *  reachable by CEO/Director — they only get the embedded PaymentSummaryCard in Quotation
 *  Details instead (see QuotationDetailsScreen.tsx). */
export type PaymentsStackParamList = {
  PaymentList: { initialStatus?: import('@/features/payments/types').PaymentStatus } | undefined;
  // Verified Bills with no Payment yet — where a newly-Verified Bill must show up for
  // Payment Department to act on. Read-only (no create action) for Accounts/Super Admin.
  BillsReadyForPayment: undefined;
  PaymentDetails: { paymentId: string };
  // `mode` distinguishes Start Processing / Retry (same mutation) from Mark Paid / Mark Failed —
  // one screen, four entry points, per the plan's "Retry reuses the Start Processing form."
  PaymentForm: { paymentId: string; mode: 'start-processing' | 'retry' | 'mark-paid' | 'mark-failed' };
};

/** Bottom tabs for the `accounts` role — Bill review only, no Vendor/Department/User access. */
export type AccountsTabParamList = {
  Dashboard: undefined;
  Bills: NavigatorScreenParams<AccountsBillsStackParamList> | undefined;
  // Read-only pipeline visibility (additive) — Accounts can view but never mutate a
  // Requirement/AI Comparison/Director Review/Vendor Registration; write actions inside these
  // shared screens already gate on other roles (Department User/HOD/Director/Super Admin).
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  // Read-only — Accounts can search/filter/view but never process a payment.
  Payments: NavigatorScreenParams<PaymentsStackParamList> | undefined;
  Reports: undefined;
  Profile: undefined;
};

export type AccountsBillsStackParamList = {
  // `initialStatus` lets the Accounts Dashboard deep-link a stat card straight into a
  // pre-filtered tab of the Bill List (e.g. tapping "Correction Requested").
  AccountsBillList: { initialStatus?: import('@/features/bills/types').BillStatus } | undefined;
  AccountsBillDetails: { billId: string };
};

/** Bottom tabs for the `director` role — read-only Quotation and Bill review. */
export type DirectorTabParamList = {
  Dashboard: undefined;
  // Phase 1 of the Enterprise Procurement Workflow — read-only for Director in Phase 1
  // (see docs/PHASE1_REQUIREMENT_MODULE.md); will receive the quotation comparison later.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  PendingQuotations: NavigatorScreenParams<QuotationsStackParamList> | undefined;
  // Reuses the same BillsStackParamList/BillsNavigator Department Users use — gated by role
  // inside BillListScreen/BillDetailsScreen, the same pattern PendingQuotations already uses.
  PendingBillApprovals: NavigatorScreenParams<BillsStackParamList> | undefined;
  // Read-only for Director — the backend already allows Director to view/download/share/verify
  // POs (see purchase-order routes), this just exposes the existing screens in the mobile nav.
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  Reports: undefined;
  Profile: undefined;
};

/** Bottom tabs for the `ceo` role. CEO only reviews Quotations (within the CEO Approval Limit).
 *  Director Financial Approval of Bills is Director-only, not CEO. */
export type CeoTabParamList = {
  Dashboard: undefined;
  PendingQuotations: NavigatorScreenParams<QuotationsStackParamList> | undefined;
  // Reuses the same BillsStackParamList/BillsNavigator Department Users use — gated by role
  // inside BillListScreen/BillDetailsScreen, same pattern as DirectorTabParamList.
  PendingBillApprovals: NavigatorScreenParams<BillsStackParamList> | undefined;
  // Read-only pipeline visibility (additive) — CEO can view but never mutate a Requirement/
  // AI Comparison/Director Review/Vendor Registration/Purchase Order/Goods Receipt.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  Reports: undefined;
  Profile: undefined;
};

/** Bottom tabs for the `payment_department` role — full Payment Module access. */
export type PaymentTabParamList = {
  Dashboard: undefined;
  Payments: NavigatorScreenParams<PaymentsStackParamList> | undefined;
  // Read-only pipeline visibility (additive) — Payment Department can view but never mutate
  // a Requirement/AI Comparison/Director Review/Vendor Registration/Purchase Order/Goods Receipt.
  Requirements: NavigatorScreenParams<RequirementsStackParamList> | undefined;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrderStackParamList> | undefined;
  Reports: undefined;
  Profile: undefined;
};

// Notification details are now shown via NotificationDetailsSheet (a bottom sheet opened
// in-place from NotificationsScreen), not a pushed stack screen — see that component.
export type NotificationsStackParamList = {
  NotificationList:    undefined;
  NotificationSettings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  // Root-level, NOT nested inside any tab's stack — deliberately outside Profile/any tab so
  // it's never persisted as a tab's "current screen". Reachable from anywhere via the bell
  // icon; Back always pops straight back to whatever tab/screen was visible underneath,
  // and selecting the Profile tab is therefore never affected by this screen having been open.
  NotificationCenter: NavigatorScreenParams<NotificationsStackParamList> | undefined;
  // Root-level so it's directly reachable from a push notification tap regardless of which
  // tab/stack the Director/CEO is currently on. Back always returns to wherever they were.
  QuotationApproval: { quotationId: string; notificationId?: string };
  // Root-level so Directors can reach this directly from a `bill_financial_approval_required`
  // notification tap, regardless of which tab they are currently on.
  BillFinancialApproval: { billId: string; notificationId?: string };
  // Root-level specifically for the Director role, which has no `Vendors` tab at all (unlike
  // HOD/Super Admin) — a `vendor_registered` notification tap/deep-link would otherwise
  // navigate into a tab that doesn't exist for that role and silently go nowhere.
  VendorDetailsRoot: { vendorId: string };
  // Root-level for CEO/Director, neither of which has a `Payments` tab — a payment
  // notification tap/deep-link would otherwise navigate into a tab that doesn't exist for
  // either role and silently go nowhere. Same rationale as `VendorDetailsRoot` above.
  PaymentDetailsRoot: { paymentId: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
