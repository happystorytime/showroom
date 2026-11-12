export type WorkStatus = 'New' | 'Pending' | 'Processing' | 'Submitted' | 'Completed' | 'Rejected' | 'On Hold';

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';

export type VehicleType = 'Tractor' | 'Commercial Goods' | 'Passenger Cab' | 'Auto Rickshaw' | 'Two Wheeler' | 'Private Car' | 'Bus' | 'Trailer';

export type TractorBrand = 'Mahindra' | 'Swaraj' | 'John Deere' | 'Sonalika' | 'Massey Ferguson' | 'New Holland' | 'Kubota' | 'Farmtrac' | 'Powertrac' | 'Eicher';

export type TractorStockStatus = 'In Stock' | 'Sold' | 'Booked' | 'In Transit';

export type LoanStatus = 'Applied' | 'Login' | 'In Verification' | 'Approved' | 'Disbursed' | 'Rejected' | 'Closed';

export type FinanceCompany = 
  | 'Tyger Capital'
  | 'TVS Credit Ltd'
  | 'DCB Bank Ltd'
  | 'Kotak Mahindra Bank Ltd'
  | 'Vastu Finance'
  | 'IndusInd Bank'
  | 'IFFCO Kisan Finance'
  | 'Shriram Finance'
  | 'Sundaram Finance';

export type ExpenseCategory = 
  | 'Fuel'
  | 'Transport'
  | 'Office'
  | 'Printing'
  | 'Staff Salary'
  | 'Government Fees'
  | 'Other Expenses';

export type DocumentCategory =
  | 'RC'
  | 'Insurance'
  | 'Aadhaar'
  | 'PAN Card'
  | 'Driving Licence'
  | 'Form 29'
  | 'Form 30'
  | 'Form 35'
  | 'NOC'
  | 'Fitness Certificate'
  | 'Permit'
  | 'Other Documents';

export interface Client {
  id: string; // e.g. CLI-1001
  name: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  aadhaar: string;
  registrationDate: string; // YYYY-MM-DD
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string; // e.g. VEH-1001
  clientId: string;
  vehicleNumber: string; // e.g. KA-04-MB-4521
  ownerName: string;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  manufacturingYear: number;
  chassisNumber: string;
  engineNumber: string;
  fuelType: 'Diesel' | 'Petrol' | 'Electric' | 'CNG';
  registrationDate: string;
  rcValidity: string; // YYYY-MM-DD
  insuranceExpiry: string; // YYYY-MM-DD
  documentStatus: 'Complete' | 'Pending Verification' | 'Expired';
  createdAt: string;
}

export interface RTOApplication {
  id: string; // e.g. APP-1001
  clientId: string;
  vehicleId: string;
  clientName: string;
  vehicleNumber: string;
  workType: string;
  applicationNumber: string;
  rtoOffice: string; // e.g. KA-04 (Bangalore North)
  applicationDate: string;
  submissionDate: string;
  completionDate?: string;
  expectedCompletionDate: string;
  totalFees: number;
  advancePaid: number;
  balanceAmount: number;
  workStatus: WorkStatus;
  workDescription?: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string; // e.g. DOC-1001
  clientId: string;
  vehicleId: string;
  vehicleNumber: string;
  clientName: string;
  documentType: DocumentCategory;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  receivedStatus: 'Received' | 'Missing' | 'Submitted to RTO' | 'Returned to Client';
  verificationStatus: 'Verified' | 'Pending' | 'Rejected';
  filePathOrReference: string;
  remarks: string;
  createdAt: string;
}

export interface TractorItem {
  id: string; // e.g. TRC-1001
  registrationNumber: string;
  brand: TractorBrand;
  model: string;
  manufacturingYear: number;
  chassisNumber: string;
  engineNumber: string;
  ownerName: string;
  customerMobile?: string;
  rcStatus: 'Available' | 'In Process' | 'Expired' | 'N/A';
  insuranceStatus: 'Active' | 'Expired' | 'Pending Renewal';
  purchaseDate: string;
  stockStatus: TractorStockStatus;
  price: number;
  deliveryDate?: string;
  deliveryStatus?: 'Delivered' | 'Pending' | 'Scheduled';
  remarks?: string;
}

export interface TractorExchange {
  id: string; // e.g. EXC-1001
  customerName: string;
  customerMobile: string;
  oldTractorNumber: string;
  oldTractorModel: string;
  oldChassisNumber: string;
  oldEngineNumber: string;
  oldTractorOwner: string;
  oldTractorValuation: number;
  exchangeDate: string;
  newTractorModel: string;
  newTractorNumber: string;
  newTractorPrice: number;
  exchangeDifferenceAmount: number; // New Price - Old Valuation
  remarks: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string; // e.g. LON-1001
  customerName: string;
  customerMobile: string;
  tractorNumber: string;
  financeCompany: FinanceCompany;
  loanAmount: number;
  documentCharges: number;
  netCreditAmount: number; // loanAmount - documentCharges
  loanStatus: LoanStatus;
  loginDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  firstPayment: number;
  holdAmount: number;
  pendingAmount: number;
  accountClosureStatus: 'Active' | 'Closed' | 'NOC Issued';
  remarks?: string;
}

export interface PaymentTransaction {
  id: string; // e.g. TXN-1001
  date: string;
  clientId: string;
  clientName: string;
  vehicleNumber: string;
  applicationId: string;
  paymentType: 'Advance' | 'Installment' | 'Final Clearance' | 'Document Fee';
  totalFees: number;
  advancePayment: number;
  additionalPayment: number;
  totalPaid: number; // advance + additional
  balanceAmount: number; // totalFees - totalPaid
  paymentMode: PaymentMode;
  transactionReference: string;
  remarks: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string; // e.g. EXP-1001
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  remarks: string;
  createdAt: string;
}

export interface ArchivedRecord {
  archiveId: string;
  entityType: 'Client' | 'Vehicle' | 'Application' | 'Tractor' | 'Exchange' | 'Loan' | 'Payment' | 'Expense' | 'Document';
  entityId: string;
  summary: string;
  data: any;
  deletedAt: string;
  deletedBy: string;
}

export interface SystemSettings {
  businessName: string;
  tagline: string;
  address: string;
  mobile: string;
  email: string;
  gstNumber?: string;
  rtoLicenseNumber?: string;
  rtoOffices: string[];
  vehicleTypes: string[];
  workTypes: string[];
  paymentModes: string[];
  expenseCategories: string[];
  financeCompanies: string[];
  applicationStatuses: string[];
  enablePasswordProtection: boolean;
  adminPassword?: string;
}

export type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'year';
