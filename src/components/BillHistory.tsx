import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  Download, 
  Printer, 
  X,
  FileText,
  Copy
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';
import type { Bill } from '../store/useTransportStore';
import { downloadBillPDF, printBill } from '../utils/pdfGenerator';
import { convertAmountToWords } from '../utils/numberToWords';

// Shared formatter for Indian Rupees currency formatting
const formatRupee = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export const BillHistory: React.FC = () => {
  const { bills, deleteBill, fetchInitialData, isLoading, settings } = useTransportStore();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTruck, setSearchTruck] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected bill for preview modal
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleEdit = (id: number) => {
    navigate(`/create-bill?edit=${id}`);
  };

  const handleDuplicate = (id: number) => {
    navigate(`/create-bill?duplicate=${id}`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice? All truck entry sub-logs will also be deleted.')) {
      const ok = await deleteBill(id);
      if (ok) {
        alert('Invoice deleted successfully');
      }
    }
  };

  // Filter bills
  const filteredBills = bills.filter(b => {
    // 1. Search Query (Bill Number or Party Name)
    const matchQuery = 
      b.bill_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.party_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Search by Truck Number
    const matchTruck = 
      !searchTruck || 
      b.truck_entries?.some(t => (t.truck_no || '').toLowerCase().includes(searchTruck.toLowerCase()));

    // 3. Date Filters
    if (dateFilter === 'all') return matchQuery && matchTruck;

    const bDate = new Date(b.bill_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchDate = false;

    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      matchDate = b.bill_date === todayStr;
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      matchDate = bDate >= oneWeekAgo && bDate <= new Date();
    } else if (dateFilter === 'month') {
      const currentMonthStr = today.toISOString().substring(0, 7); // "YYYY-MM"
      matchDate = b.bill_date.startsWith(currentMonthStr);
    } else if (dateFilter === 'custom') {
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        matchDate = bDate >= start && bDate <= end;
      } else {
        matchDate = true; // if dates are empty, ignore custom filter
      }
    }

    return matchQuery && matchTruck && matchDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Bill History & Ledger</h2>
          <p className="text-xs text-gray-500 font-medium">Search, filter, edit, duplicate, and download PDFs of all generated invoices</p>
        </div>
        <button
          onClick={() => navigate('/create-bill')}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          Create New Bill
        </button>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#2563EB]" />
          Search & Date Range Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* General Search */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search Invoice/Party</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                placeholder="e.g., JMVT001 or KRITI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Truck Search */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search by Truck No</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono font-bold uppercase"
                placeholder="e.g., UP78..."
                value={searchTruck}
                onChange={(e) => setSearchTruck(e.target.value)}
              />
            </div>
          </div>

          {/* Date Filter Type */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date Period</label>
            <select
              className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-[#2563EB] font-semibold text-gray-700"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-[11px] focus:outline-none focus:border-[#2563EB]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-[11px] focus:outline-none focus:border-[#2563EB]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white border border-[#E5E7EB] rounded overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-[#E5E7EB] text-gray-600 font-semibold">
                <th className="p-3 font-semibold">Bill No.</th>
                <th className="p-3 font-semibold">Bill Date</th>
                <th className="p-3 font-semibold">Party / Customer</th>
                <th className="p-3 font-semibold">Route</th>
                <th className="p-3 font-semibold">Weight</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Grand Total</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading && bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400 bg-white">Loading ledger records...</td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400 bg-white">No invoices found matching current criteria.</td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id || b.uuid} className="hover:bg-slate-50 font-medium">
                    <td className="p-3 font-mono font-bold text-gray-900">{b.bill_no}</td>
                    <td className="p-3 text-gray-500">
                      {b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="p-3 text-gray-800 truncate max-w-[220px]">{b.party_name}</td>
                    <td className="p-3 text-gray-600">
                      {b.from_location} &rarr; {b.to_location}
                    </td>
                    <td className="p-3 font-semibold">{b.total_weight} MT</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                        b.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                        b.status === 'Draft' ? 'bg-gray-50 text-gray-700 border border-gray-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {b.status || 'Generated'}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-gray-900">
                      {formatRupee(b.total_amount)}
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedBill(b)}
                        title="Quick View Preview"
                        className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#2563EB] rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => b.id && handleEdit(b.id)}
                        title="Edit Bill"
                        className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#2563EB] rounded transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => b.id && handleDuplicate(b.id)}
                        title="Duplicate (Use template)"
                        className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#16A34A] rounded transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          // Download PDF immediately
                          downloadBillPDF(`bill-preview-history-${b.id}`, `${b.bill_no}.pdf`);
                        }}
                        title="Download PDF"
                        className="p-1 hover:bg-slate-200 text-gray-600 hover:text-red-500 rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {b.pdf_url && (
                        <a
                          href={`https://api.whatsapp.com/send?text=Invoice%20${encodeURIComponent(b.bill_no)}%20URL:%20${encodeURIComponent(b.pdf_url)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Share on WhatsApp"
                          className="p-1 hover:bg-slate-200 text-green-600 hover:text-green-700 rounded transition-colors flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.022-.08-.124-.22-.282-.282-.157-.063-.93-.458-1.075-.5-.145-.044-.25-.067-.355.08-.104.148-.405.5-.497.603-.092.1-.183.112-.34.05a4.293 4.293 0 0 1-1.258-.776c-.287-.253-.48-.564-.536-.65-.056-.092-.006-.142.04-.187.04-.04.092-.1.138-.15.045-.053.06-.09.09-.15.03-.06.015-.113-.007-.158-.022-.046-.25-.6-.343-.824-.09-.22-.18-.19-.247-.19-.065 0-.14-.008-.215-.008a.417.417 0 0 0-.3.14c-.1.107-.384.375-.384.914 0 .54.39.1.444.176.054.075.77 1.176 1.866 1.648.26.112.464.18.623.23.262.082.5.07.69.04.21-.03.93-.38 1.06-.75.13-.365.13-.68.09-.75zM12.01 2.012a9.98 9.98 0 0 0-7.054 2.922 9.985 9.985 0 0 0 0 14.108l.056.09-1.002 3.655 3.738-.98.094.056a9.99 9.99 0 0 0 11.22-.888 9.979 9.979 0 0 0 2.915-7.054 9.98 9.98 0 0 0-9.967-9.909zM12 22a9.96 9.96 0 0 1-5.086-1.39l-.364-.216-2.228.583.593-2.164-.236-.376A9.972 9.972 0 0 1 12 20a10 10 0 0 0 10-10A10 10 0 0 0 12 2z"/>
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => b.id && handleDelete(b.id)}
                        title="Delete Bill"
                        className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#DC2626] rounded transition-colors"
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

      {/* Hidden print containers for history items so that PDF generator can target them by ID */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {filteredBills.map(b => (
          <div key={`bill-preview-history-${b.id}`} id={`bill-preview-history-${b.id}`}>
            <InvoicePrintLayout bill={b} settings={settings} />
          </div>
        ))}
      </div>

      {/* PREVIEW MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-[#E5E7EB] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold text-gray-700">Invoice Viewer: <span className="font-mono text-gray-900">{selectedBill.bill_no}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Trigger download on the modal template
                    downloadBillPDF('modal-invoice-printable', `${selectedBill.bill_no}.pdf`);
                  }}
                  className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    // Print bill using native window print (hide modal styling via CSS print rules)
                    // We copy the contents to window or print the hidden area.
                    // To print, we can trigger printBill
                    printBill();
                  }}
                  className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-gray-700 hover:bg-slate-50 font-semibold text-xs py-1.5 px-3 rounded shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Bill
                </button>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="p-1 hover:bg-slate-200 rounded text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable A4 Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              {/* Force clean layout for live viewer */}
              <div id="modal-invoice-printable" className="w-[794px] min-h-[1123px] bg-white p-8 border border-gray-300 shadow-lg text-black font-sans leading-normal relative select-none">
                <InvoicePrintLayout bill={selectedBill} settings={settings} />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

/* --- PRINT-READY COMPONENT FOR A4 SHEETS --- */
interface PrintLayoutProps {
  bill: Bill;
  settings: any;
}

export const InvoicePrintLayout: React.FC<PrintLayoutProps> = ({ bill, settings }) => {
  return (
    <div className="w-full text-black bg-white flex flex-col font-sans p-1 text-[11px]">
      
      {/* 1. Header with Logo & Main Address Details */}
      <div className="border border-black p-3 flex justify-between items-start gap-4">
        
        {/* Left Side: Logo & Info */}
        <div className="flex items-start gap-3">
          <img 
            src={settings.logo_url || '/logo.png'} 
            alt="Logo" 
            className="w-14 h-14 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight uppercase leading-none mb-1">
              {settings.company_name}
            </h1>
            <p className="text-[10px] text-gray-700 font-semibold leading-tight whitespace-pre-line">
              {settings.address}
            </p>
            <div className="flex flex-wrap gap-x-3 text-[10px] font-semibold text-gray-700 mt-1">
              <span>Email: {settings.email}</span>
              <span>|</span>
              <span>Phones: {[settings.phone_1, settings.phone_2, settings.phone_3].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Right Side: GST / PAN */}
        <div className="text-right text-[10px] font-bold space-y-1">
          {settings.gstin?.trim() && (
            <div className="border border-black px-2 py-0.5 rounded">
              <span>GSTIN: </span>
              <span className="font-mono">{settings.gstin}</span>
            </div>
          )}
          {settings.pan?.trim() && (
            <div className="border border-black px-2 py-0.5 rounded">
              <span>PAN: </span>
              <span className="font-mono">{settings.pan}</span>
            </div>
          )}
        </div>

      </div>

      {/* 2. Customer details & Bill Details */}
      <div className="grid grid-cols-5 border-l border-r border-b border-black">
        
        {/* Consignor/Consignee Info (Left Columns) */}
        <div className="col-span-3 p-3 border-r border-black space-y-1">
          <span className="block text-[10px] font-bold text-gray-500 uppercase leading-none mb-1">M/s. (Billing Party)</span>
          <div className="text-xs font-bold leading-tight uppercase">{bill.party_name}</div>
          {bill.gst_number && (
            <div className="font-semibold text-gray-700">GSTIN: <span className="font-mono font-bold text-black">{bill.gst_number}</span></div>
          )}
          <div className="text-[10px] text-gray-600 font-semibold whitespace-pre-line">{bill.address}</div>
          <div className="text-[10px] font-bold uppercase">{[bill.city, bill.state].filter(Boolean).join(', ')}</div>
        </div>

        {/* Invoice details (Right Columns) */}
        <div className="col-span-2 divide-y divide-black flex flex-col justify-stretch">
          <div className="p-2 grid grid-cols-2 flex-1 items-center">
            <span className="font-bold text-gray-500 uppercase text-[9px]">Bill No:</span>
            <span className="font-mono font-extrabold text-black text-right text-xs uppercase">{bill.bill_no}</span>
          </div>
          <div className="p-2 grid grid-cols-2 flex-1 items-center">
            <span className="font-bold text-gray-500 uppercase text-[9px]">Bill Date:</span>
            <span className="font-bold text-black text-right">{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-GB') : '-'}</span>
          </div>
          <div className="p-2 grid grid-cols-2 flex-1 items-center">
            <span className="font-bold text-gray-500 uppercase text-[9px]">LR Number:</span>
            <span className="font-bold text-black text-right uppercase">{bill.lr_no || '-'}</span>
          </div>
          <div className="p-2 grid grid-cols-2 flex-1 items-center">
            <span className="font-bold text-gray-500 uppercase text-[9px]">Sub Date:</span>
            <span className="font-bold text-black text-right">{bill.sub_date ? new Date(bill.sub_date).toLocaleDateString('en-GB') : '-'}</span>
          </div>
        </div>

      </div>

      {/* 3. Transport details summary */}
      <div className="grid grid-cols-5 border-l border-r border-b border-black text-center font-bold text-[10px] bg-slate-50 py-1.5 divide-x divide-black">
        <div>
          <span className="block text-[8px] text-gray-500 uppercase leading-none mb-0.5">From Location</span>
          <span className="uppercase text-black">{bill.from_location || '-'}</span>
        </div>
        <div>
          <span className="block text-[8px] text-gray-500 uppercase leading-none mb-0.5">To Location</span>
          <span className="uppercase text-black">{bill.to_location || '-'}</span>
        </div>
        <div>
          <span className="block text-[8px] text-gray-500 uppercase leading-none mb-0.5">Total weight</span>
          <span className="text-black">{bill.total_weight} MT</span>
        </div>
        <div>
          <span className="block text-[8px] text-gray-500 uppercase leading-none mb-0.5">Base Freight</span>
          <span className="text-black">{formatRupee(bill.freight_amount)}</span>
        </div>
        <div>
          <span className="block text-[8px] text-gray-500 uppercase leading-none mb-0.5">Grand Total</span>
          <span className="text-black text-[11px] font-extrabold">{formatRupee(bill.total_amount)}</span>
        </div>
      </div>

      {/* 4. Multiple Truck Entries Table */}
      <div className="border-l border-r border-b border-black flex-1 min-h-[350px] flex flex-col justify-between">
        
        {/* Table rows */}
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-center font-bold divide-x divide-black text-[9px]">
              <th className="p-1.5 w-10 text-center">S.R.</th>
              <th className="p-1.5">Truck No.</th>
              <th className="p-1.5">LR No.</th>
              <th className="p-1.5">Date</th>
              <th className="p-1.5">From</th>
              <th className="p-1.5">To</th>
              <th className="p-1.5 text-center w-16">Weight (MT)</th>
              <th className="p-1.5 text-right w-20">Freight Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/40">
            {bill.truck_entries && bill.truck_entries.length > 0 ? (
              bill.truck_entries.map((t, idx) => (
                <tr key={t.id || idx} className="divide-x divide-black/40 text-center font-medium">
                  <td className="p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="p-1.5 font-mono font-bold text-black uppercase">{t.truck_no}</td>
                  <td className="p-1.5 uppercase font-mono">{t.lr_no || '-'}</td>
                  <td className="p-1.5">
                    {t.entry_date ? new Date(t.entry_date).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td className="p-1.5 uppercase truncate max-w-[70px]">{t.from_location}</td>
                  <td className="p-1.5 uppercase truncate max-w-[70px]">{t.to_location}</td>
                  <td className="p-1.5 text-center font-bold">{t.weight} MT</td>
                  <td className="p-1.5 text-right font-mono font-bold text-black">{formatRupee(t.amount || 0)}</td>
                </tr>
              ))
            ) : (
              // Fallback single row matching main details
              <tr className="divide-x divide-black/40 text-center font-medium">
                <td className="p-1.5 text-center font-bold">1</td>
                <td className="p-1.5 font-mono font-bold text-black uppercase">-</td>
                <td className="p-1.5 uppercase font-mono">{bill.lr_no || '-'}</td>
                <td className="p-1.5">
                  {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-GB') : '-'}
                </td>
                <td className="p-1.5 uppercase truncate max-w-[70px]">{bill.from_location}</td>
                <td className="p-1.5 uppercase truncate max-w-[70px]">{bill.to_location}</td>
                <td className="p-1.5 text-center font-bold">{bill.total_weight} MT</td>
                <td className="p-1.5 text-right font-mono font-bold text-black">{formatRupee(bill.freight_amount)}</td>
              </tr>
            )}

            {/* Empty space rows to maintain dense A4 aspect ratio height */}
            {Array.from({ length: Math.max(0, 10 - (bill.truck_entries?.length || 1)) }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="divide-x divide-transparent text-center h-6">
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40"></td>
                <td className="p-1 border-r border-black/40 text-right"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t border-black grid grid-cols-5 text-[10px] font-bold py-1 px-3 bg-slate-50 items-center">
          <div className="col-span-3 text-gray-500 uppercase text-[8px]">TOTAL SUMMARY WEIGHT & CHARGES</div>
          <div className="text-center font-extrabold text-black">{bill.total_weight} MT</div>
          <div className="text-right font-mono font-extrabold text-[#2563EB] text-xs">
            {formatRupee(bill.freight_amount)}
          </div>
        </div>

      </div>

      {/* 5. Charges Breakup Grid */}
      <div className="grid grid-cols-5 border-l border-r border-b border-black divide-x divide-black text-[9px] font-bold">
        
        {/* Loading Charges */}
        <div className="p-1.5 flex flex-col justify-between">
          <span className="text-gray-500 uppercase text-[8px] leading-none mb-1">Loading Chg.</span>
          <span className="font-mono text-black text-right">{formatRupee(bill.loading_charges)}</span>
        </div>

        {/* Unloading Charges */}
        <div className="p-1.5 flex flex-col justify-between">
          <span className="text-gray-500 uppercase text-[8px] leading-none mb-1">Unloading Chg.</span>
          <span className="font-mono text-black text-right">{formatRupee(bill.unloading_charges)}</span>
        </div>

        {/* Detention Charges */}
        <div className="p-1.5 flex flex-col justify-between">
          <span className="text-gray-500 uppercase text-[8px] leading-none mb-1">Detention Chg.</span>
          <span className="font-mono text-black text-right">{formatRupee(bill.detention_charges)}</span>
        </div>

        {/* Other Charges */}
        <div className="p-1.5 flex flex-col justify-between">
          <span className="text-gray-500 uppercase text-[8px] leading-none mb-1">Other Chg.</span>
          <span className="font-mono text-black text-right">{formatRupee(bill.other_charges)}</span>
        </div>

        {/* Final Grand Total */}
        <div className="p-1.5 bg-[#2563EB]/10 flex flex-col justify-between text-[#2563EB]">
          <span className="uppercase text-[8px] leading-none mb-1">Grand Total</span>
          <span className="font-mono font-extrabold text-right text-[11px]">{formatRupee(bill.total_amount)}</span>
        </div>

      </div>

      {/* 6. Amount in Words */}
      <div className="border-l border-r border-b border-black p-3 space-y-1">
        <span className="block text-[8px] font-bold text-gray-500 uppercase leading-none">Amount in Words</span>
        <div className="text-[10px] font-bold text-black capitalize">
          {bill.amount_in_words || convertAmountToWords(bill.total_amount)}
        </div>
      </div>

      {/* 7. Bottom Section: Notes & Signatures */}
      <div className="grid grid-cols-2 border-l border-r border-b border-black flex-shrink-0 h-24">
        
        {/* Notes (Left) */}
        <div className="p-3 border-r border-black flex flex-col justify-start">
          <span className="block text-[8px] font-bold text-gray-500 uppercase leading-none mb-1">Notes / Terms</span>
          <p className="text-[9px] text-gray-600 font-medium whitespace-pre-line leading-snug">
            {bill.notes || '1. Subject to Indore Jurisdiction.\n2. Payment terms as agreed upon.'}
          </p>
        </div>

        {/* Signature Area (Right) */}
        <div className="p-3 flex flex-col justify-between items-end relative">
          <span className="block text-[8px] font-bold text-gray-500 uppercase leading-none text-right">For {settings.company_name}</span>
          
          {settings.signature_url ? (
            <img 
              src={settings.signature_url} 
              alt="Proprietor Sign" 
              className="h-10 w-28 object-contain mr-4 mb-1"
            />
          ) : (
            <div className="h-10 flex items-end mr-4 mb-1 font-mono italic text-[10px] text-gray-400">
              Proprietor Sign
            </div>
          )}

          <span className="text-[9px] font-bold text-gray-700 uppercase leading-none mt-2 border-t border-black border-dashed pt-1 w-32 text-center mr-2">
            Authorised Signatory
          </span>
        </div>

      </div>

    </div>
  );
};
