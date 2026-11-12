import React, { useState } from 'react';
import {
  Tractor,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  Truck,
  Tag,
  Calendar,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { TractorItem, TractorBrand, TractorStockStatus } from '../types';
import { AppDatabase, getNextTractorId } from '../utils/storage';
import { formatINR } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface TractorShowroomProps {
  db: AppDatabase;
  onAddTractor: (item: TractorItem) => void;
  onUpdateStockStatus: (id: string, status: TractorStockStatus) => void;
  onDeleteTractor: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const TractorShowroom: React.FC<TractorShowroomProps> = ({
  db,
  onAddTractor,
  onUpdateStockStatus,
  onDeleteTractor,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Tractor Form State
  const [brand, setBrand] = useState<TractorBrand>('Mahindra');
  const [model, setModel] = useState('');
  const [mfgYear, setMfgYear] = useState<number>(new Date().getFullYear());
  const [regNumber, setRegNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [price, setPrice] = useState<number>(750000);
  const [stockStatus, setStockStatus] = useState<TractorStockStatus>('In Stock');
  const [ownerName, setOwnerName] = useState('Shree Maruthi Showroom Stock');
  const [customerMobile, setCustomerMobile] = useState('');
  const [rcStatus, setRcStatus] = useState<'Available' | 'In Process' | 'Expired' | 'N/A'>('Available');
  const [insuranceStatus, setInsuranceStatus] = useState<'Active' | 'Expired' | 'Pending Renewal'>('Active');
  const [purchaseDate, setPurchaseDate] = useState(currentDateStr);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'Delivered' | 'Pending' | 'Scheduled'>('Pending');
  const [remarks, setRemarks] = useState('');

  const tractorBrands: TractorBrand[] = [
    'Mahindra',
    'Swaraj',
    'John Deere',
    'Sonalika',
    'Massey Ferguson',
    'New Holland',
    'Kubota',
    'Farmtrac',
    'Powertrac',
    'Eicher',
  ];

  const filteredTractors = db.tractors.filter((t) => {
    const matchesSearch =
      t.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || t.stockStatus === statusFilter;
    const matchesBrand = brandFilter === 'All' || t.brand === brandFilter;

    return matchesSearch && matchesStatus && matchesBrand;
  });

  const handleSaveTractor = (e: React.FormEvent) => {
    e.preventDefault();
    const newTractor: TractorItem = {
      id: getNextTractorId(db.tractors),
      registrationNumber: regNumber.toUpperCase().trim() || `TRC-${Date.now().toString().slice(-4)}`,
      brand,
      model: model.trim() || 'Standard Edition',
      manufacturingYear: Number(mfgYear) || 2024,
      chassisNumber: chassisNumber.toUpperCase().trim() || 'CH-TRACTOR-01',
      engineNumber: engineNumber.toUpperCase().trim() || 'ENG-TRACTOR-01',
      ownerName: ownerName.trim(),
      customerMobile: customerMobile.trim(),
      rcStatus,
      insuranceStatus,
      purchaseDate,
      stockStatus,
      price: Number(price) || 0,
      deliveryDate: deliveryDate || undefined,
      deliveryStatus: stockStatus === 'Sold' ? 'Delivered' : deliveryStatus,
      remarks: remarks.trim(),
    };

    onAddTractor(newTractor);
    setIsAddOpen(false);
    setModel('');
    setRegNumber('');
    setChassisNumber('');
    setEngineNumber('');
    setRemarks('');
  };

  const handlePrintStock = () => {
    const headers = [
      'Tractor ID',
      'Reg Number',
      'Brand & Model',
      'Mfg Year',
      'Chassis Number',
      'Stock Status',
      'Showroom Price',
      'Customer / Owner',
      'Delivery Status',
    ];
    const data = filteredTractors.map((t) => [
      t.id,
      t.registrationNumber,
      `${t.brand} ${t.model}`,
      t.manufacturingYear,
      t.chassisNumber,
      t.stockStatus,
      formatINR(t.price),
      t.ownerName,
      t.deliveryStatus || 'N/A',
    ]);
    exportGeneralReportPDF('Tractor Showroom Stock & Sales Report', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tractor className="w-5 h-5 text-amber-600" />
            <span>07. Tractor Showroom Inventory & Sales</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-brand tractor stock management (Mahindra, Swaraj, John Deere), customer delivery tracking & sales valuation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Brands</option>
            {tractorBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Sold">Sold</option>
            <option value="Booked">Booked</option>
            <option value="In Transit">In Transit</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tractor, chassis, customer..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Tractor</span>
          </button>

          <button
            onClick={handlePrintStock}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Stock Report</span>
          </button>
        </div>
      </div>

      {/* Tractor Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Tractor ID</th>
                <th className="px-4 py-3">Registration & Brand</th>
                <th className="px-4 py-3">Model & Year</th>
                <th className="px-4 py-3">Chassis & Engine</th>
                <th className="px-4 py-3">Customer / Owner</th>
                <th className="px-4 py-3 text-right">Price (₹)</th>
                <th className="px-4 py-3 text-center">Stock Status</th>
                <th className="px-4 py-3 text-center">Delivery Info</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTractors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching tractors found in stock.
                  </td>
                </tr>
              ) : (
                filteredTractors.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{t.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {t.registrationNumber}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700">{t.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-semibold">{t.model}</div>
                      <div className="text-[10px] text-slate-400">Mfg Year: {t.manufacturingYear}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      <div>CH: {t.chassisNumber}</div>
                      <div>ENG: {t.engineNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{t.ownerName}</div>
                      {t.customerMobile && (
                        <div className="text-[10px] text-slate-400 font-mono">{t.customerMobile}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatINR(t.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={t.stockStatus}
                        onChange={(e) => onUpdateStockStatus(t.id, e.target.value as TractorStockStatus)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold border focus:outline-none cursor-pointer ${
                          t.stockStatus === 'In Stock'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : t.stockStatus === 'Sold'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : t.stockStatus === 'Booked'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Booked">Booked</option>
                        <option value="Sold">Sold</option>
                        <option value="In Transit">In Transit</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-[11px] font-medium text-slate-700">
                        {t.deliveryStatus || 'Pending'}
                      </div>
                      {t.deliveryDate && (
                        <div className="text-[10px] text-slate-400">{t.deliveryDate}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteTractor(t.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Tractor Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NEW TRACTOR MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Tractor className="w-4 h-4 text-amber-600" />
                Add Tractor to Showroom Inventory
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTractor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tractor Brand</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value as TractorBrand)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {tractorBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model Name & HP</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. 575 DI Sarpanch 47HP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration / Stock No.</label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-04-TB-8815 or Chassis No"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturing Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2030}
                    value={mfgYear}
                    onChange={(e) => setMfgYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    required
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. M575DKA202688"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Engine Number</label>
                  <input
                    type="text"
                    required
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ENG5759912"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Showroom Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Status</label>
                  <select
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value as TractorStockStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="In Stock">In Stock (Available)</option>
                    <option value="Booked">Booked (Token Received)</option>
                    <option value="Sold">Sold (Delivered)</option>
                    <option value="In Transit">In Transit (Factory Truck)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer / Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Showroom Stock or Customer Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Mobile</label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="e.g. 9845012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks & Specifications</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Heavy duty bumper, sunshade canopy and cultivator hook included"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save to Showroom Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
