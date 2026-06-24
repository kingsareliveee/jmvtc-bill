import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  FileText, 
  User, 
  Truck, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Calculator, 
  Printer, 
  Download, 
  RotateCcw,
  Save
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';
import type { Bill, TruckEntry, Party } from '../store/useTransportStore';
import { downloadBillPDF, printBill, generateBillPDFBlob } from '../utils/pdfGenerator';
import { convertAmountToWords } from '../utils/numberToWords';
import { InvoicePrintLayout } from './BillHistory';

interface TruckFormInputs {
  truck_no: string;
  lr_no: string;
  entry_date: string;
  from_location: string;
  to_location: string;
  weight: number;
  amount: number;
}

export const CreateBill: React.FC = () => {
  const { 
    bills, 
    parties, 
    trucks, 
    settings, 
    addBill, 
    updateBill, 
    getNextBillNumber,
    fetchInitialData
  } = useTransportStore();
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');

  // Local state
  const [truckEntries, setTruckEntries] = useState<Omit<TruckEntry, 'id' | 'uuid' | 'bill_id'>[]>([]);
  const [editingTruckIndex, setEditingTruckIndex] = useState<number | null>(null);
  const [partyAutocomplete, setPartyAutocomplete] = useState<Party[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [truckAutocomplete, setTruckAutocomplete] = useState<string[]>([]);
  const [activeTruckField, setActiveTruckField] = useState<'main' | 'sub'>('main');
  const [showTruckDropdown, setShowTruckDropdown] = useState(false);

  // Form setup
  const { register, handleSubmit, setValue, watch, reset } = useForm<Bill>({
    defaultValues: {
      bill_no: '',
      party_name: '',
      gst_number: '',
      address: '',
      city: '',
      state: '',
      bill_date: new Date().toISOString().split('T')[0],
      lr_no: '',
      sub_date: '',
      from_location: '',
      to_location: '',
      total_weight: 0,
      freight_amount: 0,
      loading_charges: 0,
      unloading_charges: 0,
      detention_charges: 0,
      other_charges: 0,
      total_amount: 0,
      amount_in_words: 'Rupees Zero Only',
      notes: '1. Subject to Indore Jurisdiction.\n2. Payment terms as agreed upon.',
      status: 'Generated'
    }
  });

  // Watch fields for live preview and calculations
  const watchedPartyName = watch('party_name');
  const watchedFrom = watch('from_location');
  const watchedTo = watch('to_location');
  const watchedLr = watch('lr_no');
  const watchedDate = watch('bill_date');
  const watchedWeight = watch('total_weight');
  const watchedFreight = watch('freight_amount');
  const watchedLoading = watch('loading_charges');
  const watchedUnloading = watch('unloading_charges');
  const watchedDetention = watch('detention_charges');
  const watchedOther = watch('other_charges');
  const watchedBill = watch();

  // Mini Form state for sub-trucks entries
  const [subTruck, setSubTruck] = useState<TruckFormInputs>({
    truck_no: '',
    lr_no: '',
    entry_date: new Date().toISOString().split('T')[0],
    from_location: '',
    to_location: '',
    weight: 0,
    amount: 0
  });

  // Load Initial Data
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Edit / Duplicate Mode initialization
  useEffect(() => {
    const targetId = editId || duplicateId;
    if (targetId && bills.length > 0) {
      const match = bills.find(b => String(b.id) === targetId);
      if (match) {
        // Initialize form fields
        reset({
          ...match,
          // If duplicating, generate a new bill number and reset date
          bill_no: editId ? match.bill_no : getNextBillNumber(),
          bill_date: editId ? match.bill_date : new Date().toISOString().split('T')[0],
        });
        
        // Initialize truck list
        if (match.truck_entries) {
          setTruckEntries(match.truck_entries.map(t => ({
            truck_no: t.truck_no,
            lr_no: t.lr_no || '',
            entry_date: t.entry_date || '',
            from_location: t.from_location || '',
            to_location: t.to_location || '',
            weight: Number(t.weight || 0),
            amount: Number(t.amount || 0)
          })));
        }
      }
    } else if (!editId && !duplicateId) {
      // Create Mode: auto-fill next bill number
      setValue('bill_no', getNextBillNumber());
    }
  }, [editId, duplicateId, bills, reset, setValue]);

  // Autocomplete Parties filtering
  useEffect(() => {
    if (watchedPartyName && watchedPartyName.trim()) {
      const query = watchedPartyName.toLowerCase();
      const filtered = parties.filter(p => p.party_name.toLowerCase().includes(query));
      setPartyAutocomplete(filtered);
    } else {
      setPartyAutocomplete([]);
    }
  }, [watchedPartyName, parties]);

  // Autocomplete Truck filtering
  const handleTruckSearch = (val: string, field: 'main' | 'sub') => {
    setActiveTruckField(field);
    if (field === 'main') {
      setValue('lr_no', val); // just keeping track
    } else {
      setSubTruck(prev => ({ ...prev, truck_no: val }));
    }

    if (val && val.trim()) {
      const filtered = trucks
        .filter(t => t.truck_no.toLowerCase().includes(val.toLowerCase()))
        .map(t => t.truck_no);
      setTruckAutocomplete(filtered);
      setShowTruckDropdown(true);
    } else {
      setTruckAutocomplete([]);
      setShowTruckDropdown(false);
    }
  };

  const selectParty = (party: Party) => {
    setValue('party_name', party.party_name);
    setValue('gst_number', party.gst_number || '');
    setValue('address', party.address || '');
    setValue('city', party.city || '');
    setValue('state', party.state || '');
    setShowPartyDropdown(false);
  };

  const selectTruck = (truckNo: string) => {
    if (activeTruckField === 'sub') {
      setSubTruck(prev => ({ ...prev, truck_no: truckNo }));
    }
    setShowTruckDropdown(false);
  };

  // Recalculate totals whenever truck list or extra charges change
  useEffect(() => {
    let freightSum = Number(watchedFreight || 0);
    let weightSum = Number(watchedWeight || 0);

    if (truckEntries.length > 0) {
      weightSum = truckEntries.reduce((sum, t) => sum + Number(t.weight || 0), 0);
      freightSum = truckEntries.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      // Auto fill weight & base freight if multiple trucks exist
      setValue('total_weight', weightSum);
      setValue('freight_amount', freightSum);
    }

    const loading = Number(watchedLoading || 0);
    const unloading = Number(watchedUnloading || 0);
    const detention = Number(watchedDetention || 0);
    const other = Number(watchedOther || 0);

    const grandTotal = freightSum + loading + unloading + detention + other;
    setValue('total_amount', grandTotal);
    setValue('amount_in_words', convertAmountToWords(grandTotal));

  }, [
    truckEntries, 
    watchedFreight, 
    watchedWeight, 
    watchedLoading, 
    watchedUnloading, 
    watchedDetention, 
    watchedOther, 
    setValue
  ]);

  // Truck entry CRUD
  const handleAddTruckRow = () => {
    if (!subTruck.truck_no.trim()) {
      alert('Please fill out Truck Number');
      return;
    }

    const newEntry = {
      truck_no: subTruck.truck_no.toUpperCase(),
      lr_no: subTruck.lr_no || watchedLr,
      entry_date: subTruck.entry_date || watchedDate,
      from_location: subTruck.from_location || watchedFrom,
      to_location: subTruck.to_location || watchedTo,
      weight: Number(subTruck.weight || 0),
      amount: Number(subTruck.amount || 0)
    };

    if (editingTruckIndex !== null) {
      const updated = [...truckEntries];
      updated[editingTruckIndex] = newEntry;
      setTruckEntries(updated);
      setEditingTruckIndex(null);
    } else {
      setTruckEntries([...truckEntries, newEntry]);
    }

    // Reset sub-form but keep routing values
    setSubTruck({
      truck_no: '',
      lr_no: '',
      entry_date: watchedDate,
      from_location: watchedFrom || '',
      to_location: watchedTo || '',
      weight: 0,
      amount: 0
    });
  };

  const handleEditTruckRow = (index: number) => {
    const entry = truckEntries[index];
    setSubTruck({
      truck_no: entry.truck_no || '',
      lr_no: entry.lr_no || '',
      entry_date: entry.entry_date || watchedDate,
      from_location: entry.from_location || watchedFrom || '',
      to_location: entry.to_location || watchedTo || '',
      weight: Number(entry.weight || 0),
      amount: Number(entry.amount || 0)
    });
    setEditingTruckIndex(index);
  };

  const handleDeleteTruckRow = (index: number) => {
    if (window.confirm('Delete this truck entry?')) {
      const updated = truckEntries.filter((_, idx) => idx !== index);
      setTruckEntries(updated);
      if (editingTruckIndex === index) {
        setEditingTruckIndex(null);
      }
    }
  };

  // Submit invoice
  const onSubmit = async (formData: Bill) => {
    try {
      const finalBillData = {
        bill_no: formData.bill_no,
        party_name: formData.party_name,
        gst_number: formData.gst_number,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        bill_date: formData.bill_date,
        lr_no: formData.lr_no,
        sub_date: formData.sub_date || null,
        from_location: formData.from_location,
        to_location: formData.to_location,
        total_weight: Number(formData.total_weight || 0),
        freight_amount: Number(formData.freight_amount || 0),
        loading_charges: Number(formData.loading_charges || 0),
        unloading_charges: Number(formData.unloading_charges || 0),
        detention_charges: Number(formData.detention_charges || 0),
        other_charges: Number(formData.other_charges || 0),
        total_amount: Number(formData.total_amount || 0),
        amount_in_words: formData.amount_in_words,
        notes: formData.notes,
        status: formData.status || 'Generated'
      };

      if (truckEntries.length === 0) {
        alert('Please add at least one Truck Entry under Multiple Truck Support.');
        return;
      }

      // Generate PDF blob using html2pdf.js helper
      let pdfBlob: Blob | undefined = undefined;
      try {
        pdfBlob = await generateBillPDFBlob('a4-bill-preview-content');
      } catch (pdfErr) {
        console.error('Failed to pre-generate PDF Blob:', pdfErr);
      }

      if (editId) {
        const ok = await updateBill(Number(editId), finalBillData, truckEntries, pdfBlob);
        if (ok) {
          alert('Bill updated successfully');
          navigate('/bill-history');
        }
      } else {
        const result = await addBill(finalBillData, truckEntries, pdfBlob);
        if (result) {
          alert(`Bill ${result.bill_no} created successfully!`);
          navigate('/bill-history');
        }
      }
    } catch (err: any) {
      alert('Error creating bill: ' + err.message);
    }
  };

  // Form Reset
  const handleClearForm = () => {
    if (window.confirm('Clear all form fields?')) {
      reset({
        bill_no: getNextBillNumber(),
        party_name: '',
        gst_number: '',
        address: '',
        city: '',
        state: '',
        bill_date: new Date().toISOString().split('T')[0],
        lr_no: '',
        sub_date: '',
        from_location: '',
        to_location: '',
        total_weight: 0,
        freight_amount: 0,
        loading_charges: 0,
        unloading_charges: 0,
        detention_charges: 0,
        other_charges: 0,
        total_amount: 0,
        amount_in_words: 'Rupees Zero Only',
        notes: '1. Subject to Indore Jurisdiction.\n2. Payment terms as agreed upon.',
        status: 'Generated'
      });
      setTruckEntries([]);
      setEditingTruckIndex(null);
    }
  };

  // Bill preview values (mapping fields together for preview display)
  const previewBill: Bill = {
    ...watchedBill,
    truck_entries: truckEntries
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {editId ? 'Modify Invoice Ledger' : 'Create Transport Invoice'}
          </h2>
          <p className="text-xs text-gray-500 font-medium">Create cargo billing invoices with auto calculations and A4 PDF rendering</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              // Trigger PDF Download
              downloadBillPDF('a4-bill-preview-content', `${watchedBill.bill_no || 'JMVT-Bill'}.pdf`);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Generate PDF
          </button>
          
          <button
            type="button"
            onClick={() => printBill()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-gray-700 font-bold text-xs py-2 px-4 rounded shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            Print Bill
          </button>
        </div>
      </div>

      {/* Primary Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* Form Column */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Customer / Party details */}
          <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-3 relative">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#2563EB]" />
              Customer / Party Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Party Name Autocomplete */}
              <div className="relative col-span-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Party Name *</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="Type to search..."
                  autoComplete="off"
                  {...register('party_name', { required: true })}
                  onFocus={() => setShowPartyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                />
                
                {showPartyDropdown && partyAutocomplete.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg text-xs">
                    {partyAutocomplete.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 font-medium block border-b border-gray-50 last:border-none"
                        onMouseDown={() => selectParty(p)}
                      >
                        {p.party_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GST Number</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-semibold text-gray-800"
                  placeholder="e.g., 23AAACK7170L1ZG"
                  {...register('gst_number')}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Address</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                placeholder="Street address..."
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">City</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="e.g., INDORE"
                  {...register('city')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">State</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="e.g., MADHYA PRADESH"
                  {...register('state')}
                />
              </div>
            </div>
          </div>

          {/* Bill Details */}
          <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              Bill Information
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bill No. *</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono font-bold text-gray-900"
                  {...register('bill_no', { required: true })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bill Date *</label>
                <input
                  type="date"
                  className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-[11px] focus:outline-none focus:border-[#2563EB] font-semibold text-gray-800"
                  {...register('bill_date', { required: true })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">LR Number</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-semibold"
                  placeholder="e.g., LR-129"
                  {...register('lr_no')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sub Date</label>
                <input
                  type="date"
                  className="w-full px-2 py-1 border border-[#E5E7EB] rounded text-[11px] focus:outline-none focus:border-[#2563EB]"
                  {...register('sub_date')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                <select
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-[#2563EB] font-semibold text-gray-700"
                  {...register('status')}
                >
                  <option value="Generated">Generated</option>
                  <option value="Draft">Draft</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transport / Route Details */}
          <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#2563EB]" />
              Transport / Route Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From Location *</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="e.g., INDORE"
                  {...register('from_location', { required: true })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To Location *</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="e.g., GORAKHPUR"
                  {...register('to_location', { required: true })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Weight (MT)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-bold"
                  placeholder="0"
                  {...register('total_weight', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Freight Amt (₹)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono font-bold text-gray-900"
                  placeholder="0"
                  {...register('freight_amount', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Multiple Truck entries */}
          <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-3 relative">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#2563EB]" />
              Multiple Truck Support
            </h3>

            {/* Truck Mini Sub Form */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-slate-50 p-2.5 border border-[#E5E7EB] rounded">
              
              {/* Truck autocomplete */}
              <div className="relative">
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Truck No *</label>
                <input
                  type="text"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none focus:border-[#2563EB] font-mono font-bold uppercase"
                  placeholder="e.g., UP78..."
                  value={subTruck.truck_no}
                  onChange={(e) => handleTruckSearch(e.target.value, 'sub')}
                  onFocus={() => setShowTruckDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTruckDropdown(false), 200)}
                />
                {showTruckDropdown && activeTruckField === 'sub' && truckAutocomplete.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-32 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg text-[10px] font-mono font-bold">
                    {truckAutocomplete.map(t => (
                      <button
                        key={t}
                        type="button"
                        className="w-full text-left px-2 py-1 hover:bg-slate-100 block border-b border-gray-50 last:border-none"
                        onMouseDown={() => selectTruck(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">LR No</label>
                <input
                  type="text"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none"
                  placeholder="LR No"
                  value={subTruck.lr_no}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, lr_no: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Date</label>
                <input
                  type="date"
                  className="w-full px-1 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none"
                  value={subTruck.entry_date}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, entry_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">From</label>
                <input
                  type="text"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none"
                  placeholder="From"
                  value={subTruck.from_location}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, from_location: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">To</label>
                <input
                  type="text"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none"
                  placeholder="To"
                  value={subTruck.to_location}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, to_location: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Weight</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none"
                  placeholder="MT"
                  value={subTruck.weight || ''}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, weight: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Amount</label>
                <input
                  type="number"
                  className="w-full px-1.5 py-1 border border-[#E5E7EB] rounded text-[10px] focus:outline-none font-bold"
                  placeholder="₹"
                  value={subTruck.amount || ''}
                  onChange={(e) => setSubTruck(prev => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>

              <div className="col-span-2 sm:col-span-4 lg:col-span-7 flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddTruckRow}
                  className="bg-white border border-[#2563EB] hover:bg-blue-50 text-[#2563EB] font-bold text-[10px] py-1 px-3 rounded flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingTruckIndex !== null ? 'Update Truck' : 'Add Truck Entry'}
                </button>
              </div>

            </div>

            {/* Truck Sub-Entries Table */}
            {truckEntries.length > 0 && (
              <div className="border border-[#E5E7EB] rounded overflow-hidden mt-2">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-[#E5E7EB] text-gray-600 font-bold">
                      <th className="p-2 text-center w-8">#</th>
                      <th className="p-2">Truck No</th>
                      <th className="p-2">LR No</th>
                      <th className="p-2">Route</th>
                      <th className="p-2 text-center w-16">Weight</th>
                      <th className="p-2 text-right w-20">Amount</th>
                      <th className="p-2 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {truckEntries.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="p-2 text-center font-bold text-gray-400">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-gray-800">{t.truck_no}</td>
                        <td className="p-2 font-mono">{t.lr_no}</td>
                        <td className="p-2 text-gray-500">
                          {t.from_location} &rarr; {t.to_location}
                        </td>
                        <td className="p-2 text-center font-bold">{t.weight} MT</td>
                        <td className="p-2 text-right font-mono font-bold text-gray-900">₹{t.amount}</td>
                        <td className="p-2 text-center flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditTruckRow(idx)}
                            className="p-0.5 hover:bg-slate-200 text-gray-600 rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTruckRow(idx)}
                            className="p-0.5 hover:bg-slate-200 text-red-500 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Charges section */}
          <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#2563EB]" />
              Charges Breakup
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Base Freight (₹)</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-700 bg-slate-50"
                  readOnly={truckEntries.length > 0}
                  {...register('freight_amount', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Loading Chg (₹)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-700"
                  placeholder="0"
                  {...register('loading_charges', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Unloading (₹)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-700"
                  placeholder="0"
                  {...register('unloading_charges', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Detention (₹)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-700"
                  placeholder="0"
                  {...register('detention_charges', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Other Chg (₹)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-700"
                  placeholder="0"
                  {...register('other_charges', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Total display */}
            <div className="bg-blue-50/70 border border-blue-100 rounded p-3 flex justify-between items-center mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Calculated Grand Total</span>
              <span className="font-mono font-extrabold text-lg text-[#2563EB]">
                ₹{Number(watchedBill.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Amount In Words & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-2">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Amount In Words (Auto)</span>
              <div className="text-xs font-bold text-gray-800 bg-slate-50 border border-slate-100 rounded p-2 min-h-12 capitalize leading-snug">
                {watchedBill.amount_in_words}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Notes / Terms (Optional)</label>
              <textarea
                rows={2}
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium resize-none"
                placeholder="Optional notes..."
                {...register('notes')}
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-4">
            <button
              type="submit"
              className="flex-1 bg-[#16A34A] hover:bg-green-700 text-white font-bold text-xs py-2.5 px-4 rounded shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {editId ? 'Update Bill Ledger' : 'Save Invoice Bill'}
            </button>

            <button
              type="button"
              onClick={handleClearForm}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
              Clear Form
            </button>
          </div>

        </form>

        {/* Live Preview Column (A4 Page Frame) */}
        <div className="absolute -left-[9999px] xl:static bg-slate-100 border border-gray-300 rounded p-6 overflow-y-auto max-h-[85vh] sticky top-16 shadow-inner flex justify-center">
          <div 
            id="a4-bill-preview-content" 
            className="w-[690px] min-h-[975px] bg-white p-6 shadow-md text-black font-sans leading-normal relative select-none border border-gray-300"
          >
            <InvoicePrintLayout bill={previewBill} settings={settings} />
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar for Mobile Layout containing "Generate PDF" */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] p-3 z-40 shadow-lg flex gap-2">
        <button
          type="button"
          onClick={() => {
            downloadBillPDF('a4-bill-preview-content', `${watchedBill.bill_no || 'JMVT-Bill'}.pdf`);
          }}
          className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded text-center shadow-md flex items-center justify-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Generate PDF (Download)
        </button>
      </div>



    </div>
  );
};
