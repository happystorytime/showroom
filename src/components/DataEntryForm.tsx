import React, { useMemo, useState } from 'react';
import {
  Save,
  RotateCcw,
  UserPlus,
  Users,
  Car,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import type {
  Client,
  DocumentCategory,
  FuelType,
  HypothecationStatus,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
  WorkStatus,
} from '../types';
import {
  DOCUMENT_CATEGORIES,
  FUEL_TYPES,
  RTO_WORK_CATEGORIES,
  WORK_STATUSES,
} from '../types';
import {
  findDuplicateClient,
  formatAadhaarInput,
  formatPanInput,
  formatVehicleNumber,
  getRequiredDocsForWorkType,
  getTodayDateStr,
} from '../utils/pureCalculations';

interface DataEntryFormProps {
  showrooms: Showroom[];
  activeShowroomId: string;
  clients: Client[];
  vehicles: Vehicle[];
  settings: SystemSettings;
  onSaveEntry: (entry: {
    client: Client;
    clientExists: boolean;
    vehicle: Vehicle;
    vehicleExists: boolean;
    application: RTOApplication;
  }) => Promise<void>;
  getNextClientId: () => string;
  getNextVehicleId: () => string;
  getNextApplicationId: () => string;
  onDoneNavigate: () => void;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({
  showrooms,
  activeShowroomId,
  clients,
  vehicles,
  settings,
  onSaveEntry,
  getNextClientId,
  getNextVehicleId,
  getNextApplicationId,
  onDoneNavigate,
}) => {
  const today = getTodayDateStr();
  const defaultShowroom =
    activeShowroomId !== 'ALL'
      ? activeShowroomId
      : showrooms.find((s) => s.isActive)?.id || showrooms[0]?.id || 'SHW-101';

  const [showroomId, setShowroomId] = useState<string>(defaultShowroom);

  // Common Client Mode: reuse existing OR register new
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientLookupQuery, setClientLookupQuery] = useState('');
  const [clientName, setClientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registrationDate, setRegistrationDate] = useState(today);
  const [clientRemarks, setClientRemarks] = useState('');

  // Vehicle Mode: reuse client's existing vehicle OR add new
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleClass, setVehicleClass] = useState<string>(
    settings.vehicleClasses[0] || 'Agricultural Tractor'
  );
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState<number>(new Date().getFullYear());
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [vehRegDate, setVehRegDate] = useState(today);
  const [rcValidity, setRcValidity] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [hypothecationStatus, setHypothecationStatus] = useState<HypothecationStatus>('None');
  const [hypothecationFinancer, setHypothecationFinancer] = useState('');
  const [rtoOffice, setRtoOffice] = useState<string>(
    settings.rtoOffices[0] || 'KA-04 (Bangalore North - Yeshwanthpur)'
  );
  const [documentStatus, setDocumentStatus] = useState<'Complete' | 'Pending Verification' | 'Expired'>('Pending Verification');

  // RTO Application
  const [workType, setWorkType] = useState<string>(RTO_WORK_CATEGORIES[0]);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [applicationDate, setApplicationDate] = useState(today);
  const [submissionDate, setSubmissionDate] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [workStatus, setWorkStatus] = useState<WorkStatus>('New');
  const [workDescription, setWorkDescription] = useState('');
  const [appRemarks, setAppRemarks] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<DocumentCategory[]>(() =>
    getRequiredDocsForWorkType(RTO_WORK_CATEGORIES[0], settings)
  );

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const filteredLookupClients = useMemo(() => {
    const q = clientLookupQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    const matchingVehClientIds = new Set(
      vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(q)).map((v) => v.clientId)
    );
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.id.toLowerCase().includes(q) ||
          matchingVehClientIds.has(c.id)
      )
      .slice(0, 8);
  }, [clients, vehicles, clientLookupQuery]);

  const clientVehicles = useMemo(() => {
    if (!selectedClientId) return [];
    return vehicles.filter((v) => v.clientId === selectedClientId);
  }, [vehicles, selectedClientId]);

  const duplicateClientMatch = useMemo(() => {
    if (selectedClientId) return null;
    if (mobile.replace(/\D/g, '').length < 10 && aadhaar.replace(/\D/g, '').length < 12 && panNumber.length < 10) {
      return null;
    }
    return findDuplicateClient(clients, { mobile, aadhaar, panNumber });
  }, [selectedClientId, clients, mobile, aadhaar, panNumber]);

  const handleSelectExistingClient = (client: Client) => {
    setSelectedClientId(client.id);
    setClientName(client.name);
    setMobile(client.mobile);
    setAlternateMobile(client.alternateMobile || '');
    setAddress(client.address || '');
    setAadhaar(client.aadhaar || '');
    setPanNumber(client.panNumber || '');
    setRegistrationDate(client.registrationDate || today);
    setClientRemarks(client.remarks || '');
    setSelectedVehicleId('');
    setClientLookupQuery('');
  };

  const handleResetToNewClient = () => {
    setSelectedClientId('');
    setClientName('');
    setMobile('');
    setAlternateMobile('');
    setAddress('');
    setAadhaar('');
    setPanNumber('');
    setRegistrationDate(today);
    setClientRemarks('');
    setSelectedVehicleId('');
  };

  const handleSelectExistingVehicle = (vehId: string) => {
    setSelectedVehicleId(vehId);
    const v = vehicles.find((x) => x.id === vehId);
    if (!v) {
      setVehicleNumber('');
      setManufacturer('');
      setModel('');
      setChassisNumber('');
      setEngineNumber('');
      return;
    }
    setVehicleNumber(v.vehicleNumber);
    setVehicleClass(v.vehicleClass);
    setManufacturer(v.manufacturer);
    setModel(v.model);
    setManufacturingYear(v.manufacturingYear);
    setFuelType(v.fuelType);
    setChassisNumber(v.chassisNumber);
    setEngineNumber(v.engineNumber);
    setVehRegDate(v.registrationDate || today);
    setRcValidity(v.rcValidity || '');
    setInsuranceExpiry(v.insuranceExpiry || '');
    setHypothecationStatus(v.hypothecationStatus || 'None');
    setHypothecationFinancer(v.hypothecationFinancer || '');
    setRtoOffice(v.rtoOffice || settings.rtoOffices[0] || '');
    setDocumentStatus(v.documentStatus);
  };

  const handleWorkTypeChange = (nextType: string) => {
    setWorkType(nextType);
    setRequiredDocs(getRequiredDocsForWorkType(nextType, settings));
  };

  const toggleRequiredDoc = (cat: DocumentCategory) => {
    setRequiredDocs((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleClearForm = () => {
    handleResetToNewClient();
    setVehicleNumber('');
    setManufacturer('');
    setModel('');
    setChassisNumber('');
    setEngineNumber('');
    setRcValidity('');
    setInsuranceExpiry('');
    setHypothecationStatus('None');
    setHypothecationFinancer('');
    setApplicationNumber('');
    setSubmissionDate('');
    setExpectedCompletionDate('');
    setWorkStatus('New');
    setWorkDescription('');
    setAppRemarks('');
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!showroomId) {
      setFeedback({ type: 'error', message: 'Please select a Showroom branch.' });
      return;
    }
    if (!clientName.trim() || mobile.replace(/\D/g, '').length < 10) {
      setFeedback({
        type: 'error',
        message: 'Client full name and a valid 10-digit mobile number are required.',
      });
      return;
    }
    if (!vehicleNumber.trim()) {
      setFeedback({ type: 'error', message: 'Vehicle registration number is required.' });
      return;
    }
    if (duplicateClientMatch) {
      setFeedback({
        type: 'error',
        message: `Client already exists in common database (${duplicateClientMatch.client.name} — ${duplicateClientMatch.client.id}). Click "Reuse Existing Client" above to link without duplicating.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const existingClient = selectedClientId
      ? clients.find((c) => c.id === selectedClientId)
      : undefined;
    const clientId = existingClient ? existingClient.id : getNextClientId();

    const clientObj: Client = {
      id: clientId,
      createdShowroomId: existingClient?.createdShowroomId || showroomId,
      name: clientName.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile.trim(),
      address: address.trim(),
      aadhaar: aadhaar.trim() || undefined,
      panNumber: panNumber.trim().toUpperCase() || undefined,
      registrationDate: registrationDate || today,
      remarks: clientRemarks.trim(),
      createdAt: existingClient?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const existingVehicle = selectedVehicleId
      ? vehicles.find((v) => v.id === selectedVehicleId)
      : undefined;
    const vehicleId = existingVehicle ? existingVehicle.id : getNextVehicleId();
    const cleanVehNo = formatVehicleNumber(vehicleNumber);

    const vehicleObj: Vehicle = {
      id: vehicleId,
      clientId,
      vehicleNumber: cleanVehNo,
      chassisNumber: chassisNumber.trim().toUpperCase(),
      engineNumber: engineNumber.trim().toUpperCase(),
      vehicleClass,
      model: model.trim(),
      manufacturer: manufacturer.trim(),
      manufacturingYear: Number(manufacturingYear) || new Date().getFullYear(),
      fuelType,
      ownerName: clientObj.name,
      registrationDate: vehRegDate || today,
      rcValidity: rcValidity || '',
      insuranceExpiry: insuranceExpiry || '',
      hypothecationStatus,
      hypothecationFinancer:
        hypothecationStatus === 'Hypothecated' ? hypothecationFinancer.trim() : undefined,
      rtoOffice,
      documentStatus,
      createdAt: existingVehicle?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const appId = getNextApplicationId();
    const appObj: RTOApplication = {
      id: appId,
      showroomId,
      clientId,
      vehicleId,
      clientName: clientObj.name,
      vehicleNumber: cleanVehNo,
      workType,
      applicationNumber: applicationNumber.trim().toUpperCase(),
      rtoOffice,
      applicationDate: applicationDate || today,
      submissionDate,
      expectedCompletionDate,
      completionDate: workStatus === 'Completed' ? today : undefined,
      requiredDocuments: requiredDocs,
      workStatus,
      workDescription: workDescription.trim(),
      remarks: appRemarks.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setSubmitting(true);
    try {
      await onSaveEntry({
        client: clientObj,
        clientExists: Boolean(existingClient),
        vehicle: vehicleObj,
        vehicleExists: Boolean(existingVehicle),
        application: appObj,
      });
      setFeedback({
        type: 'success',
        message: `Saved RTO Application ${appId} for ${clientObj.name} (${cleanVehNo}).`,
      });
      handleClearForm();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save RTO entry.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          {feedback.type === 'success' && (
            <button
              type="button"
              onClick={onDoneNavigate}
              className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              View RTO Applications
            </button>
          )}
        </div>
      )}

      {/* Step 1: Showroom Selection */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              1. Showroom Assignment
            </h2>
            <p className="text-xs text-slate-500">
              Link this RTO application to a showroom branch while saving the client in the common registry.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <select
              value={showroomId}
              onChange={(e) => setShowroomId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {showrooms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Centralized Common Client */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Common Client Details
            </h2>
            {selectedClientId && (
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                Reusing {selectedClientId}
              </span>
            )}
          </div>
          {selectedClientId ? (
            <button
              type="button"
              onClick={handleResetToNewClient}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Switch to New Client</span>
            </button>
          ) : null}
        </div>

        {/* Lookup Existing Common Client */}
        {!selectedClientId && clients.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={clientLookupQuery}
                onChange={(e) => setClientLookupQuery(e.target.value)}
                placeholder="Search existing common client by name, mobile, or vehicle reg number..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {clientLookupQuery.trim().length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filteredLookupClients.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    No matching common client found. Fill the fields below to register a new client.
                  </span>
                ) : (
                  filteredLookupClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingClient(c)}
                      className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-blue-50"
                    >
                      <span className="font-semibold">{c.name}</span> · {c.mobile} ({c.id})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateClientMatch && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Existing client found by {duplicateClientMatch.matchedBy}:{' '}
                <strong>{duplicateClientMatch.client.name}</strong> ({duplicateClientMatch.client.id} ·{' '}
                {duplicateClientMatch.client.mobile}). Avoid creating a duplicate!
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectExistingClient(duplicateClientMatch.client)}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 shrink-0"
            >
              Reuse Existing Client
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client full name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile</label>
            <input
              type="tel"
              value={alternateMobile}
              onChange={(e) => setAlternateMobile(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Date</label>
            <input
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar (Optional)</label>
            <input
              type="text"
              value={aadhaar}
              onChange={(e) => setAadhaar(formatAadhaarInput(e.target.value))}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (Optional)</label>
            <input
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(formatPanInput(e.target.value))}
              placeholder="ABCDE1234F"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Village, Taluk, District, Karnataka"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Remarks</label>
            <input
              type="text"
              value={clientRemarks}
              onChange={(e) => setClientRemarks(e.target.value)}
              placeholder="Notes about the client"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Step 3: Vehicle Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-indigo-600" />
            <h2 className="font-display text-base font-bold text-slate-900">
              3. Vehicle Details
            </h2>
          </div>

          {clientVehicles.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Client&apos;s Vehicles:</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => handleSelectExistingVehicle(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="">+ Enroll New Vehicle</option>
                {clientVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} — {v.model || v.vehicleClass}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registration Number *
            </label>
            <input
              type="text"
              required
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="KA-04-MB-4521"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Class *</label>
            <select
              value={vehicleClass}
              onChange={(e) => setVehicleClass(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {settings.vehicleClasses.map((vc) => (
                <option key={vc} value={vc}>
                  {vc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Mahindra, John Deere, Tata"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Yuvo Tech+ 575"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chassis Number</label>
            <input
              type="text"
              value={chassisNumber}
              onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
              placeholder="Chassis / VIN"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Engine Number</label>
            <input
              type="text"
              value={engineNumber}
              onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
              placeholder="Engine no."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mfg Year</label>
            <input
              type="number"
              min={1980}
              max={2035}
              value={manufacturingYear}
              onChange={(e) => setManufacturingYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Type</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Date</label>
            <input
              type="date"
              value={vehRegDate}
              onChange={(e) => setVehRegDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">RC Validity</label>
            <input
              type="date"
              value={rcValidity}
              onChange={(e) => setRcValidity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Validity</label>
            <input
              type="date"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hypothecation Status</label>
            <select
              value={hypothecationStatus}
              onChange={(e) => setHypothecationStatus(e.target.value as HypothecationStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="None">None (No Loan)</option>
              <option value="Hypothecated">Hypothecated (HP Active)</option>
              <option value="Terminated">Terminated (HP Cleared)</option>
            </select>
          </div>
          {hypothecationStatus === 'Hypothecated' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hypothecation Financer / Bank Name
              </label>
              <input
                type="text"
                value={hypothecationFinancer}
                onChange={(e) => setHypothecationFinancer(e.target.value)}
                placeholder="e.g. State Bank of India, Mahindra Finance"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">RTO Office *</label>
            <select
              value={rtoOffice}
              onChange={(e) => setRtoOffice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {settings.rtoOffices.map((rto) => (
                <option key={rto} value={rto}>
                  {rto}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 4: RTO Work & Required Document Checklist */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          <h2 className="font-display text-base font-bold text-slate-900">
            4. RTO Work Application & Document Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RTO Work Category *
            </label>
            <select
              value={workType}
              onChange={(e) => handleWorkTypeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
            >
              {RTO_WORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vahan / Govt App Number
            </label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
              placeholder="e.g. KA2611004521"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
            <select
              value={workStatus}
              onChange={(e) => setWorkStatus(e.target.value as WorkStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {WORK_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Application Date *
            </label>
            <input
              type="date"
              required
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Date</label>
            <input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Completion
            </label>
            <input
              type="date"
              value={expectedCompletionDate}
              onChange={(e) => setExpectedCompletionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Description</label>
            <input
              type="text"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Summary of RTO service"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Required Documents Checklist for &ldquo;{workType}&rdquo; ({requiredDocs.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_CATEGORIES.map((docCat) => {
                const active = requiredDocs.includes(docCat);
                return (
                  <button
                    key={docCat}
                    type="button"
                    onClick={() => toggleRequiredDoc(docCat)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {docCat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Application Remarks
            </label>
            <input
              type="text"
              value={appRemarks}
              onChange={(e) => setAppRemarks(e.target.value)}
              placeholder="Special RTO instructions or follow-up notes"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleClearForm}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Clear Form</span>
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          <span>{submitting ? 'Saving Entry...' : 'Save RTO Entry'}</span>
        </button>
      </div>
    </form>
  );
};
