export const RTO_WORK_CATEGORIES = [
  'New Vehicle Registration',
  'Ownership Transfer',
  'RC Renewal',
  'Duplicate RC',
  'NOC',
  'Hypothecation Addition',
  'Hypothecation Termination',
  'Address Change',
  'Insurance Update',
  'Vehicle Re-registration',
  'Fitness Certificate',
  'Permit Work',
  'Other RTO Work',
] as const;

export type RTOWorkCategory = (typeof RTO_WORK_CATEGORIES)[number];

export const WORK_STATUSES = [
  'New',
  'Documents Pending',
  'Ready to Submit',
  'Submitted',
  'In Process',
  'Completed',
  'Rejected',
  'On Hold',
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

export const DOCUMENT_CATEGORIES = [
  'RC Book',
  'Aadhaar Card',
  'PAN Card',
  'Insurance',
  'Driving Licence',
  'Form 29',
  'Form 30',
  'Form 35',
  'NOC',
  'Sale Agreement',
  'Address Proof',
  'Other Documents',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const VEHICLE_CLASSES = [
  'Agricultural Tractor',
  'Tractor-Trailer',
  'Two Wheeler',
  'LMV Car',
  'Commercial Goods Vehicle',
  'Passenger Cab',
  'Auto Rickshaw',
  'Bus / Heavy Passenger',
  'Construction Equipment',
] as const;

export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'CNG', 'Hybrid'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export type HypothecationStatus = 'None' | 'Hypothecated' | 'Terminated';

export type ChecklistStatus =
  | 'Documents Complete'
  | 'Documents Incomplete'
  | 'Documents Under Verification';

export type DocumentVerificationStatus = 'Verified' | 'Pending' | 'Rejected';
export type DocumentCustodyStatus =
  | 'Received'
  | 'Missing'
  | 'Submitted to RTO'
  | 'Returned to Client';

export interface Showroom {
  id: string; // e.g. SHW-101
  name: string;
  code: string; // e.g. BLR-MAIN
  city: string;
  address: string;
  phone: string;
  managerName: string;
  rtoJurisdiction: string;
  isActive: boolean;
}

/**
 * Centralized Common Client Record shared across ALL showrooms.
 * Optional createdShowroomId tracks origin branch only; clients are never showroom-locked.
 */
export interface Client {
  id: string; // e.g. CLI-1001
  createdShowroomId?: string;
  name: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  aadhaar?: string;
  panNumber?: string;
  registrationDate: string; // YYYY-MM-DD
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle Record linked to a Client in the common database.
 */
export interface Vehicle {
  id: string; // e.g. VEH-1001
  clientId: string;
  vehicleNumber: string; // Registration number e.g. KA-04-MB-4521
  chassisNumber: string;
  engineNumber: string;
  vehicleClass: VehicleClass | string;
  model: string;
  manufacturer: string;
  manufacturingYear: number;
  fuelType: FuelType;
  ownerName: string;
  registrationDate: string; // YYYY-MM-DD
  rcValidity: string; // YYYY-MM-DD
  insuranceExpiry: string; // YYYY-MM-DD (Insurance validity)
  hypothecationStatus: HypothecationStatus;
  hypothecationFinancer?: string;
  rtoOffice: string;
  documentStatus: 'Complete' | 'Pending Verification' | 'Expired';
  createdAt: string;
  updatedAt?: string;
}

/**
 * Showroom-wise RTO Work Application linking Client + Vehicle + Showroom + Category.
 * Strictly RTO documentation & work tracking only (zero fee/payment/invoice fields).
 */
export interface RTOApplication {
  id: string; // e.g. APP-1001
  showroomId: string;
  clientId: string;
  vehicleId: string;
  clientName: string;
  vehicleNumber: string;
  workType: RTOWorkCategory | string;
  applicationNumber: string;
  rtoOffice: string; // e.g. KA-04 (Bangalore North - Yeshwanthpur)
  applicationDate: string;
  submissionDate: string;
  expectedCompletionDate: string;
  completionDate?: string;
  requiredDocuments: DocumentCategory[];
  workStatus: WorkStatus;
  workDescription?: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationHistoryEntry {
  id: string; // e.g. HIS-1001
  applicationId: string;
  showroomId: string;
  clientId: string;
  vehicleId: string;
  previousStatus?: WorkStatus | '';
  newStatus: WorkStatus;
  actionSummary: string;
  note: string;
  actorEmail: string;
  changedAt: string;
}

export interface DocumentRecord {
  id: string; // e.g. DOC-1001
  showroomId: string;
  clientId: string;
  vehicleId: string;
  applicationId?: string;
  vehicleNumber: string;
  clientName: string;
  documentType: DocumentCategory;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  receivedStatus: DocumentCustodyStatus;
  verificationStatus: DocumentVerificationStatus;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storagePath?: string;
  downloadUrl?: string;
  filePathOrReference: string;
  uploadedAt?: string;
  remarks: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ArchivedRecord {
  archiveId: string;
  showroomId: string;
  entityType: 'Client' | 'Vehicle' | 'Application' | 'Document';
  entityId: string;
  summary: string;
  data: Record<string, unknown>;
  deletedAt: string;
  deletedBy: string;
}

export type DocumentChecklistMap = Record<string, DocumentCategory[]>;

export interface SystemSettings {
  businessName: string;
  tagline: string;
  address: string;
  mobile: string;
  email: string;
  rtoLicenseNumber?: string;
  rtoOffices: string[];
  vehicleClasses: string[];
  workTypes: string[];
  applicationStatuses: string[];
  documentChecklistMap: DocumentChecklistMap;
}

export type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'year';
