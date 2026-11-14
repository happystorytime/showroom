import {
  Showroom,
  Client,
  Vehicle,
  RTOApplication,
  DocumentRecord,
  DocumentChecklistMap,
  SystemSettings,
  RTO_WORK_CATEGORIES,
  WORK_STATUSES,
  VEHICLE_CLASSES,
} from '../types';

export const SEED_SHOWROOMS: Showroom[] = [
  {
    id: 'SHW-101',
    name: 'Yeshwanthpur North RTO Desk',
    code: 'BLR-YPR',
    city: 'Bengaluru',
    address: 'No. 45, Near RTO Complex, Yeshwanthpur, Bengaluru - 560022',
    phone: '+91 98450 88231',
    managerName: 'Raghavendra Rao',
    rtoJurisdiction: 'KA-04 (Bangalore North - Yeshwanthpur)',
    isActive: true,
  },
  {
    id: 'SHW-102',
    name: 'Hubballi-Dharwad Showroom Desk',
    code: 'HBL-NTH',
    city: 'Hubballi',
    address: 'Plot 18, Gokul Road, Near APMC Complex, Hubballi - 580030',
    phone: '+91 99801 77412',
    managerName: 'Veeresh Angadi',
    rtoJurisdiction: 'KA-25 (Dharwad / Hubli)',
    isActive: true,
  },
  {
    id: 'SHW-103',
    name: 'Mysuru-Mandya Showroom Desk',
    code: 'MYS-STH',
    city: 'Mysuru',
    address: 'No. 112, Hinkal Ring Road, Mysuru - 570017',
    phone: '+91 94480 66520',
    managerName: 'Prakash Gowda',
    rtoJurisdiction: 'KA-09 (Mysore City - Lakshmipuram)',
    isActive: true,
  },
];

export const DEFAULT_DOCUMENT_CHECKLIST: DocumentChecklistMap = {
  'New Vehicle Registration': ['Aadhaar Card', 'PAN Card', 'Insurance', 'Address Proof', 'Sale Agreement'],
  'Ownership Transfer': ['RC Book', 'Aadhaar Card', 'Insurance', 'Form 29', 'Form 30', 'Sale Agreement'],
  'RC Renewal': ['RC Book', 'Aadhaar Card', 'Insurance', 'Address Proof'],
  'Duplicate RC': ['RC Book', 'Aadhaar Card', 'Insurance', 'Address Proof'],
  NOC: ['RC Book', 'Aadhaar Card', 'Insurance', 'NOC', 'Form 35'],
  'Hypothecation Addition': ['RC Book', 'Aadhaar Card', 'Insurance', 'Form 35'],
  'Hypothecation Termination': ['RC Book', 'Aadhaar Card', 'Insurance', 'Form 35', 'NOC'],
  'Address Change': ['RC Book', 'Aadhaar Card', 'Insurance', 'Address Proof'],
  'Insurance Update': ['RC Book', 'Aadhaar Card', 'Insurance'],
  'Vehicle Re-registration': ['RC Book', 'Aadhaar Card', 'Insurance', 'NOC', 'Address Proof'],
  'Fitness Certificate': ['RC Book', 'Insurance', 'Aadhaar Card'],
  'Permit Work': ['RC Book', 'Insurance', 'Driving Licence', 'Aadhaar Card'],
  'Other RTO Work': ['RC Book', 'Aadhaar Card', 'Insurance'],
};

export const KARNATAKA_RTO_OFFICES: string[] = [
  'KA-01 (Bangalore Central - Koramangala)',
  'KA-02 (Bangalore West - Rajajinagar)',
  'KA-03 (Bangalore East - Indiranagar)',
  'KA-04 (Bangalore North - Yeshwanthpur)',
  'KA-05 (Bangalore South - Jayanagar)',
  'KA-09 (Mysore City - Lakshmipuram)',
  'KA-11 (Mandya)',
  'KA-14 (Shimoga)',
  'KA-19 (Mangalore)',
  'KA-20 (Udupi)',
  'KA-22 (Belgaum)',
  'KA-25 (Dharwad / Hubli)',
  'KA-27 (Haveri)',
  'KA-32 (Kalaburagi / Gulbarga)',
  'KA-36 (Raichur)',
  'KA-37 (Koppal)',
  'KA-41 (Kengeri / Jnanabharathi)',
  'KA-50 (Yelahanka)',
  'KA-51 (Electronic City)',
  'KA-53 (K.R. Puram)',
];

export const INITIAL_SETTINGS: SystemSettings = {
  businessName: 'SHREE MARUTHI KARNATAKA RTO AGENCY',
  tagline: 'Authorized Karnataka Transport Department Multi-Showroom RTO Documentation & Compliance',
  address: 'No. 45, Near RTO Complex, Yeshwanthpur, Bengaluru - 560022',
  mobile: '+91 98450 88231',
  email: 'shreemaruthi.rto@gmail.com',
  rtoLicenseNumber: 'KA-RTO-AGT-BLR-2021-048',
  rtoOffices: [...KARNATAKA_RTO_OFFICES],
  vehicleClasses: [...VEHICLE_CLASSES],
  workTypes: [...RTO_WORK_CATEGORIES],
  applicationStatuses: [...WORK_STATUSES],
  documentChecklistMap: { ...DEFAULT_DOCUMENT_CHECKLIST },
};

// Strictly zero demo/placeholder records
export const SEED_CLIENTS: Client[] = [];
export const SEED_VEHICLES: Vehicle[] = [];
export const SEED_RTO_APPLICATIONS: RTOApplication[] = [];
export const SEED_DOCUMENTS: DocumentRecord[] = [];
