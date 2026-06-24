import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Users, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';
import type { Party } from '../store/useTransportStore';

export const PartyMaster: React.FC = () => {
  const { parties, addParty, updateParty, deleteParty, fetchInitialData, isLoading, error } = useTransportStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Omit<Party, 'id'>>();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const onSubmit = async (data: Omit<Party, 'id'>) => {
    if (editingId) {
      const ok = await updateParty(editingId, data);
      if (ok) {
        showSuccess('Party updated successfully');
        setEditingId(null);
        reset();
      }
    } else {
      const result = await addParty(data);
      if (result) {
        showSuccess('Party added successfully');
        reset();
      }
    }
  };

  const handleEdit = (party: Party) => {
    if (!party.id) return;
    setEditingId(party.id);
    setValue('party_name', party.party_name);
    setValue('gst_number', party.gst_number || '');
    setValue('address', party.address || '');
    setValue('city', party.city || '');
    setValue('state', party.state || '');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this party? This action cannot be undone.')) {
      const ok = await deleteParty(id);
      if (ok) {
        showSuccess('Party deleted successfully');
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    reset();
  };

  // Filter parties by search query
  const filteredParties = parties.filter(p => 
    p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.gst_number && p.gst_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Party Master</h2>
        <p className="text-xs text-gray-500 font-medium">Add, update, or delete customers for automatic billing auto-fill</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-[#16A34A] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="bg-[#DC2626] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Party Form */}
        <div className="lg:col-span-1 bg-white border border-[#E5E7EB] rounded p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#2563EB]" />
            {editingId ? 'Edit Party Details' : 'Add New Party'}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Party Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Party Name *</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                placeholder="e.g., KRITI NUTRIENTS PVT LTD"
                {...register('party_name', { required: 'Party name is required' })}
              />
              {errors.party_name && (
                <span className="text-[10px] text-red-500 font-medium mt-0.5 block">{errors.party_name.message}</span>
              )}
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GSTIN Number</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-semibold"
                placeholder="e.g., 23AAACK7170L1ZG"
                {...register('gst_number', { 
                  pattern: {
                    value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                    message: 'Invalid GSTIN format'
                  }
                })}
              />
              {errors.gst_number && (
                <span className="text-[10px] text-red-500 font-medium mt-0.5 block">{errors.gst_number.message}</span>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Address</label>
              <textarea
                rows={2}
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium resize-none"
                placeholder="e.g., Plot No 12, Dewas Naka"
                {...register('address')}
              />
            </div>

            {/* City & State Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">City</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="INDORE"
                  {...register('city')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">State</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  placeholder="MADHYA PRADESH"
                  {...register('state')}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded transition-colors flex items-center justify-center gap-1"
              >
                {editingId ? 'Update Party' : 'Add Party'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Party Registry Table */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded overflow-hidden shadow-xs">
          {/* Table Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-[#E5E7EB] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Saved Parties ({filteredParties.length})</span>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                placeholder="Search by name, GST or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-[#E5E7EB] text-gray-600 font-semibold">
                  <th className="p-3 font-semibold">Party Name</th>
                  <th className="p-3 font-semibold">GSTIN</th>
                  <th className="p-3 font-semibold">City/State</th>
                  <th className="p-3 font-semibold">Address</th>
                  <th className="p-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading && parties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400 bg-white">Loading parties...</td>
                  </tr>
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400 bg-white">No parties found.</td>
                  </tr>
                ) : (
                  filteredParties.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-3 font-bold text-gray-800">{p.party_name}</td>
                      <td className="p-3 font-mono text-gray-500 font-semibold">{p.gst_number || '-'}</td>
                      <td className="p-3 text-gray-600">
                        {[p.city, p.state].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="p-3 text-gray-500 truncate max-w-[150px]" title={p.address || ''}>
                        {p.address || '-'}
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(p)}
                          title="Edit Party"
                          className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#2563EB] rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => p.id && handleDelete(p.id)}
                          title="Delete Party"
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

      </div>
    </div>
  );
};
