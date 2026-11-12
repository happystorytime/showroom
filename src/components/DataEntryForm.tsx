import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  Search,
  Printer,
  ArrowLeft,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  User as UserIcon,
  Car,
  FileCheck,
  Briefcase,
} from 'lucide-react';
import {
  Client,
  Vehicle,
  RTOApplication,
  PaymentTransaction,
  VehicleType,
  WorkStatus,
} from '../types';
import { AppDatabase, getNextClientId, getNextVehicleId, getNextApplicationId, getNextTransactionId } from '../utils/storage';
import {
  calculateBalance,
  calculateTotalPaid,
  formatAadhaarInput,
  formatVehicleNumber,
  formatINR,
} from '../utils/pureCalculations';
import { exportRTOReceiptPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface DataEntryFormProps {
  db: AppDatabase;
  onSaveNewEntry: (entry: {
    client: Client;
    vehicle: Vehicle;
    application: RTOApplication;
    payment?: PaymentTransaction;
  }) => void;
  onUpdateApplication: (app: RTOApplication) => void;
  onDeleteRecord: (type: 'Client' | 'Application' | 'Vehicle', id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({
  db,
  onSaveNewEntry,
  onUpdateApplication,
  onDeleteRecord,
  onNavigate,
  currentDateStr,
}) => {
  // Client Form State
  const [clientId, setClientId] = useState(getNextClientId(db.clients));
  const [clientName, setClientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [regDate, setRegDate] = useState(currentDateStr);
  const [clientRemarks, setClientRemarks] = useState('');

  // Vehicle Form State
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Tractor');
  const [brand, setBrand] = useState('Mahindra');
  const [model, setModel] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState<number>(new Date().getFullYear());
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');

  // Document Form State
  const [rcAvailable, setRcAvailable] = useState<'Yes' | 'No'>('Yes');
  const [insuranceAvailable, setInsuranceAvailable] = useState<'Yes' | 'No'>('Yes');
  const [aadhaarAvailable, setAadhaarAvailable] = useState<'Yes' | 'No'>('Yes');
  const [otherDocs, setOtherDocs] = useState('');
  const [documentStatus, setDocumentStatus] = useState<'Complete' | 'Pending Verification' | 'Expired'>('Complete');

  // Work Form State
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [workType, setWorkType] = useState(db.settings.workTypes[0] || 'RC Renewal');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [rtoOffice, setRtoOffice] = useState(db.settings.rtoOffices[3] || 'KA-04 (Bangalore North - Yeshwanthpur)');
  const [applicationDate, setApplicationDate] = useState(currentDateStr);
  const [submissionDate, setSubmissionDate] = useState(currentDateStr);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [workStatus, setWorkStatus] = useState<WorkStatus>('New');
  const [workDescription, setWorkDescription] = useState('');
  const [totalFees, setTotalFees] = useState<number>(5000);
  const [advancePaid, setAdvancePaid] = useState<number>(2000);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [workRemarks, setWorkRemarks] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Dynamic Balance
  const balanceAmount = calculateBalance(totalFees, advancePaid);

  const handleClear = () => {
    setClientId(getNextClientId(db.clients));
    setClientName('');
    setMobile('');
    setAlternateMobile('');
    setAddress('');
    setAadhaar('');
    setRegDate(currentDateStr);
    setClientRemarks('');

    setVehicleNumber('');
    setVehicleType('Tractor');
    setBrand('Mahindra');
    setModel('');
    setManufacturingYear(new Date().getFullYear());
    setChassisNumber('');
    setEngineNumber('');

    setRcAvailable('Yes');
    setInsuranceAvailable('Yes');
    setAadhaarAvailable('Yes');
    setOtherDocs('');
    setDocumentStatus('Complete');

    setEditingAppId(null);
    setWorkType(db.settings.workTypes[0] || 'RC Renewal');
    setApplicationNumber('');
    setApplicationDate(currentDateStr);
    setSubmissionDate(currentDateStr);
    setExpectedCompletionDate(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    setWorkStatus('New');
    setWorkDescription('');
    setTotalFees(5000);
    setAdvancePaid(2000);
    setPaymentMode('Cash');
    setWorkRemarks('');

    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!clientName.trim()) {
      setErrorMsg('Client Name is required.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setErrorMsg('A valid 10-digit Mobile Number is required.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Vehicle Registration Number is required.');
      return;
    }

    const formattedVehNo = formatVehicleNumber(vehicleNumber);

    // Duplicate Check: Check if this vehicle already has an active pending application
    const existingActiveApp = db.applications.find(
      (a) =>
        a.vehicleNumber.toUpperCase() === formattedVehNo &&
        (a.workStatus === 'New' || a.workStatus === 'Processing' || a.workStatus === 'Pending')
    );

    if (existingActiveApp && !editingAppId) {
      const confirmDup = window.confirm(
        `Warning: Vehicle ${formattedVehNo} already has an active RTO Application (${existingActiveApp.id} - ${existingActiveApp.workType}). Do you want to proceed and create a new application anyway?`
      );
      if (!confirmDup) return;
    }

    // Determine target client
    const existingClient = db.clients.find(
      (c) => c.mobile.replace(/\D/g, '') === mobile.replace(/\D/g, '') || c.id === clientId
    );
    const targetClientId = existingClient ? existingClient.id : clientId;

    const newClient: Client = {
      id: targetClientId,
      name: clientName.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile.trim(),
      address: address.trim(),
      aadhaar: aadhaar.trim(),
      registrationDate: regDate,
      remarks: clientRemarks.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    // Determine vehicle
    const existingVehicle = db.vehicles.find((v) => v.vehicleNumber.toUpperCase() === formattedVehNo);
    const targetVehId = existingVehicle ? existingVehicle.id : getNextVehicleId(db.vehicles);

    const newVehicle: Vehicle = {
      id: targetVehId,
      clientId: targetClientId,
      vehicleNumber: formattedVehNo,
      ownerName: clientName.trim(),
      vehicleType,
      brand: brand.trim(),
      model: model.trim() || 'Standard Variant',
      manufacturingYear: Number(manufacturingYear) || 2024,
      chassisNumber: chassisNumber.trim() || 'UNDER_VERIF',
      engineNumber: engineNumber.trim() || 'UNDER_VERIF',
      fuelType: 'Diesel',
      registrationDate: regDate,
      rcValidity: new Date(Date.now() + 15 * 365 * 86400000).toISOString().split('T')[0],
      insuranceExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      documentStatus,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    // New RTO Application
    const nextAppId = editingAppId || getNextApplicationId(db.applications);
    const newApp: RTOApplication = {
      id: nextAppId,
      clientId: targetClientId,
      vehicleId: targetVehId,
      clientName: clientName.trim(),
      vehicleNumber: formattedVehNo,
      workType,
      applicationNumber: applicationNumber.trim() || `${rtoOffice.substring(0, 4)}-${Date.now().toString().slice(-6)}`,
      rtoOffice,
      applicationDate,
      submissionDate,
      expectedCompletionDate,
      totalFees: Number(totalFees) || 0,
      advancePaid: Number(advancePaid) || 0,
      balanceAmount,
      workStatus,
      workDescription: workDescription.trim(),
      remarks: workRemarks.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    // Advance Payment Transaction
    let paymentTxn: PaymentTransaction | undefined;
    if (advancePaid > 0) {
      paymentTxn = {
        id: getNextTransactionId(db.payments),
        date: applicationDate,
        clientId: targetClientId,
        clientName: clientName.trim(),
        vehicleNumber: formattedVehNo,
        applicationId: nextAppId,
        paymentType: 'Advance',
        totalFees: Number(totalFees) || 0,
        advancePayment: Number(advancePaid) || 0,
        additionalPayment: 0,
        totalPaid: Number(advancePaid) || 0,
        balanceAmount,
        paymentMode,
        transactionReference: `INIT-${Date.now().toString().slice(-6)}`,
        remarks: 'Advance booking amount collected at registration',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
    }

    if (editingAppId) {
      onUpdateApplication(newApp);
      setSuccessMsg(`Application ${nextAppId} updated successfully!`);
    } else {
      onSaveNewEntry({
        client: newClient,
        vehicle: newVehicle,
        application: newApp,
        payment: paymentTxn,
      });
      setSuccessMsg(
        `SUCCESS! New entry saved to database.\nClient ID: ${targetClientId}\nVehicle: ${formattedVehNo}\nApplication ID: ${nextAppId}\nBalance Due: ${formatINR(
          balanceAmount
        )}`
      );
    }
  };

  const handleSearchSelectClient = (c: Client) => {
    setClientId(c.id);
    setClientName(c.name);
    setMobile(c.mobile);
    setAlternateMobile(c.alternateMobile || '');
    setAddress(c.address);
    setAadhaar(c.aadhaar);
    setClientRemarks(c.remarks);

    // Look for client's latest vehicle
    const clientVehs = db.vehicles.filter((v) => v.clientId === c.id);
    if (clientVehs.length > 0) {
      const v = clientVehs[0];
      setVehicleNumber(v.vehicleNumber);
      setVehicleType(v.vehicleType);
      setBrand(v.brand);
      setModel(v.model);
      setManufacturingYear(v.manufacturingYear);
      setChassisNumber(v.chassisNumber);
      setEngineNumber(v.engineNumber);
    }

    setIsSearchOpen(false);
    setSuccessMsg(`Loaded Client profile: ${c.name} (${c.id})`);
  };

  const handlePrint = () => {
    if (!clientName || !vehicleNumber) {
      alert('Please fill Client Name and Vehicle details before printing receipt.');
      return;
    }
    const dummyApp: RTOApplication = {
      id: editingAppId || 'APP-PREVIEW',
      clientId,
      vehicleId: 'VEH-PREVIEW',
      clientName,
      vehicleNumber: formatVehicleNumber(vehicleNumber),
      workType,
      applicationNumber: applicationNumber || 'APMC-2026-TEMP',
      rtoOffice,
      applicationDate,
      submissionDate,
      expectedCompletionDate,
      totalFees: Number(totalFees) || 0,
      advancePaid: Number(advancePaid) || 0,
      balanceAmount,
      workStatus,
      workDescription,
      remarks: workRemarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dummyClient: Client = {
      id: clientId,
      name: clientName,
      mobile,
      alternateMobile,
      address,
      aadhaar,
      registrationDate: regDate,
      remarks: clientRemarks,
      createdAt: '',
      updatedAt: '',
    };

    exportRTOReceiptPDF(dummyApp, dummyClient, db.settings);
  };

  const searchResults = searchQuery
    ? db.clients.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.mobile.includes(searchQuery) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : db.clients;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header and Action Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {editingAppId ? `Editing RTO Application ${editingAppId}` : 'Professional RTO & Client Data Entry Form'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic ID generation, duplicate detection, integrated vehicle registration & payment calculation.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-600" />
            <span>SEARCH CLIENT</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>CLEAR FORM</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT DETAILS</span>
          </button>
        </div>
      </div>

      {/* Confirmation & Alert Feedback */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs whitespace-pre-line font-medium leading-relaxed">{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Main Data Entry Form */}
      <form onSubmit={handleSaveEntry} className="space-y-6">
        {/* SECTION 1: CLIENT INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-400" />
              <span>01. CLIENT INFORMATION</span>
            </h3>
            <span className="text-xs text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
              Client ID: {clientId} (Automatic)
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Client Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Basavaraj Gowda"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9845011223"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alternate Number</label>
              <input
                type="tel"
                maxLength={10}
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9448022334"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Village / Town, Post, Taluk, District, Karnataka - PIN Code"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
              <input
                type="text"
                maxLength={14}
                value={aadhaar}
                onChange={(e) => setAadhaar(formatAadhaarInput(e.target.value))}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registration Date</label>
              <input
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Client Remarks</label>
              <input
                type="text"
                value={clientRemarks}
                onChange={(e) => setClientRemarks(e.target.value)}
                placeholder="e.g. Farmer client referred by showroom manager"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: VEHICLE INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>02. VEHICLE INFORMATION</span>
            </h3>
            <span className="text-xs text-slate-300 font-mono">Karnataka Plates</span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vehicle Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KA-04-MB-4521"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {db.settings.vehicleTypes.map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Brand / Make</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Mahindra, Swaraj, John Deere, Tata"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Model / Variant</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. 575 DI Sarpanch, 744 FE 4WD"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manufacturing Year</label>
              <input
                type="number"
                min={1990}
                max={2030}
                value={manufacturingYear}
                onChange={(e) => setManufacturingYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chassis Number</label>
              <input
                type="text"
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                placeholder="e.g. M575DKA9874102"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Engine Number</label>
              <input
                type="text"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ENG9874210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: DOCUMENT INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>03. DOCUMENT INFORMATION</span>
            </h3>
            <span className="text-xs text-slate-300">Compliance Verification Checklist</span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">RC Available?</label>
              <select
                value={rcAvailable}
                onChange={(e) => setRcAvailable(e.target.value as 'Yes' | 'No')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                <option value="Yes">Yes (Original / Smart Card)</option>
                <option value="No">No (Lost / Pending Transfer)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Insurance Available?</label>
              <select
                value={insuranceAvailable}
                onChange={(e) => setInsuranceAvailable(e.target.value as 'Yes' | 'No')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                <option value="Yes">Yes (Active Policy Copy)</option>
                <option value="No">No (Expired / Renewal Needed)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aadhaar Available?</label>
              <select
                value={aadhaarAvailable}
                onChange={(e) => setAadhaarAvailable(e.target.value as 'Yes' | 'No')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                <option value="Yes">Yes (KYC Verified)</option>
                <option value="No">No (Pending Submission)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Overall Document Status</label>
              <select
                value={documentStatus}
                onChange={(e) =>
                  setDocumentStatus(e.target.value as 'Complete' | 'Pending Verification' | 'Expired')
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
              >
                <option value="Complete">Complete (All papers in order)</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Expired">Expired (Action Required)</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">
                Other Documents Submitted
              </label>
              <input
                type="text"
                value={otherDocs}
                onChange={(e) => setOtherDocs(e.target.value)}
                placeholder="e.g. Form 29, Form 30, Form 35 Bank NOC, Pollution (PUC) certificate, Tax token"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: RTO WORK INFORMATION & FEES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>04. WORK INFORMATION & AUTOMATIC FINANCIALS</span>
            </h3>
            <span className="text-xs text-slate-300 font-mono">
              Balance: {formatINR(balanceAmount)}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                RTO Work Type <span className="text-rose-600">*</span>
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                {db.settings.workTypes.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Karnataka RTO Office Jurisdiction <span className="text-rose-600">*</span>
              </label>
              <select
                value={rtoOffice}
                onChange={(e) => setRtoOffice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                {db.settings.rtoOffices.map((ro) => (
                  <option key={ro} value={ro}>
                    {ro}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Govt Application / Challan No.</label>
              <input
                type="text"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="e.g. KA04-NEW-2026-9901"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Date</label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">RTO Submission Date</label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Completion Date</label>
              <input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Work Status</label>
              <select
                value={workStatus}
                onChange={(e) => setWorkStatus(e.target.value as WorkStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
              >
                {db.settings.applicationStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Agreed Fees (₹)</label>
              <input
                type="number"
                min={0}
                value={totalFees}
                onChange={(e) => setTotalFees(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Advance Payment Received (₹)</label>
              <input
                type="number"
                min={0}
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                {db.settings.paymentModes.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500">Calculated Balance Amount:</span>
              <span className="text-base font-black text-rose-600 mt-0.5">
                {formatINR(balanceAmount)}
              </span>
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Work Description & Particulars</label>
              <input
                type="text"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="e.g. Commercial fitness test inspection fee and smart card endorsement charges"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTON BAR */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingAppId ? 'UPDATE ENTRY' : 'SAVE ENTRY'}</span>
            </button>

            {editingAppId && (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(editingAppId)}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>DELETE ENTRY</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>CLEAR FORM</span>
            </button>
          </div>

          <div className="text-xs text-slate-500">
            * All data is validated, timestamped, and safely saved to the local database.
          </div>
        </div>
      </form>

      {/* SEARCH CLIENT MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Search Registered Client Master
              </h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type client name, mobile number or client ID..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-slate-400">No matching clients found.</div>
              ) : (
                searchResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSearchSelectClient(c)}
                    className="py-2.5 px-2 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.mobile} | ID: {c.id} | {c.address}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="text-right">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete application <strong>{confirmDeleteId}</strong>? The record will be archived in the deleted items vault for safety.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteRecord('Application', confirmDeleteId);
                  setConfirmDeleteId(null);
                  handleClear();
                  setSuccessMsg(`Application ${confirmDeleteId} deleted and moved to archive.`);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
