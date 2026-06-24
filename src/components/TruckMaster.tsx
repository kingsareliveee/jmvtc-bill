import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';

export const TruckMaster: React.FC = () => {
  const { trucks, addTruck, deleteTruck, fetchInitialData } = useTransportStore();
  const [newTruckNo, setNewTruckNo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNo = newTruckNo.trim().toUpperCase();
    if (!cleanNo) return;

    if (trucks.some(t => t.truck_no.toUpperCase() === cleanNo)) {
      alert('Truck number already exists in list');
      return;
    }

    await addTruck({ truck_no: cleanNo });
    
    setSuccessMsg('Truck number added successfully');
    setNewTruckNo('');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteTruck = async (id: number | undefined, truckToDelete: string) => {
    if (!id) return;
    if (window.confirm(`Are you sure you want to remove "${truckToDelete}" from the autocomplete cache?`)) {
      const ok = await deleteTruck(id);
      if (ok) {
        setSuccessMsg('Truck number removed');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  const filteredTrucks = trucks.filter(t => 
    t.truck_no.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.truck_no.localeCompare(b.truck_no));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Truck Master</h2>
        <p className="text-xs text-gray-500 font-medium">Manage truck numbers to enable quick autocomplete during bill creation</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-[#16A34A] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Add Truck Form */}
        <div className="lg:col-span-1 bg-white border border-[#E5E7EB] rounded p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[#2563EB]" />
            Register New Truck
          </h3>

          <form onSubmit={handleAddTruck} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Truck Number *</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-bold text-gray-800"
                placeholder="e.g., UP78FN0842"
                value={newTruckNo}
                onChange={(e) => setNewTruckNo(e.target.value)}
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">Format should be uppercase without spaces or hyphens for clean autocomplete indexing.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Register Truck
            </button>
          </form>
        </div>

        {/* Truck List */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded overflow-hidden shadow-xs">
          {/* Header & Search */}
          <div className="p-3 bg-slate-50 border-b border-[#E5E7EB] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Registered Trucks ({filteredTrucks.length})</span>
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                placeholder="Search truck number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Grid/Table content */}
          <div className="p-4">
            {filteredTrucks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs font-medium">No truck numbers registered yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredTrucks.map((truck) => (
                  <div 
                    key={truck.id || truck.truck_no} 
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-[#E5E7EB] rounded text-xs font-mono font-bold text-gray-800"
                  >
                    <span>{truck.truck_no}</span>
                    <button
                      onClick={() => handleDeleteTruck(truck.id, truck.truck_no)}
                      className="p-0.5 text-gray-400 hover:text-[#DC2626] rounded transition-colors"
                      title="Delete from cache"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
