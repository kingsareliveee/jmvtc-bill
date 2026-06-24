import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  FilePlus, 
  ChevronRight, 
  Download, 
  Edit3 
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';
import { downloadBillPDF } from '../utils/pdfGenerator';

export const Dashboard: React.FC = () => {
  const { bills, activityLogs, fetchInitialData, isLoading } = useTransportStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Utility to format numbers in Indian formatting
  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Metric calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

  const todayBills = bills.filter(b => b.bill_date === todayStr);
  const monthlyBills = bills.filter(b => b.bill_date.startsWith(currentMonthStr));
  
  // Total Revenue splits
  const paidRevenue = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const pendingRevenue = bills.filter(b => b.status !== 'Paid' && b.status !== 'Cancelled').reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  
  // Monthly Invoicing splits
  const monthlyPaidRevenue = monthlyBills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const monthlyPendingRevenue = monthlyBills.filter(b => b.status !== 'Paid' && b.status !== 'Cancelled').reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  // Today's Invoices splits
  const todayPaidCount = todayBills.filter(b => b.status === 'Paid').length;
  const todayPendingCount = todayBills.filter(b => b.status !== 'Paid' && b.status !== 'Cancelled').length;

  const recentBills = bills.slice(0, 10);

  return (
    <div className="space-y-6">
      
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Operator Dashboard</h2>
          <p className="text-xs text-gray-500 font-medium">Real-time statistics & transport invoicing ledger</p>
        </div>
        <button
          onClick={() => navigate('/create-bill')}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <FilePlus className="w-4 h-4" />
          Quick Create Bill
        </button>
      </div>

      {/* Loading State */}
      {isLoading && bills.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Total Revenue */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Ledger Revenue</span>
                <div className="text-2xl font-bold text-[#111827]">{formatRupee(paidRevenue + pendingRevenue)}</div>
                <div className="text-[10px] font-semibold flex gap-2">
                  <span className="text-[#16A34A]">Paid: {formatRupee(paidRevenue)}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600">Pending: {formatRupee(pendingRevenue)}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 text-[#2563EB] rounded-full">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Monthly Bills & Revenue */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Month's Invoicing</span>
                <div className="text-2xl font-bold text-[#111827]">
                  {formatRupee(monthlyPaidRevenue + monthlyPendingRevenue)}
                </div>
                <div className="text-[10px] font-semibold flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="text-green-600">Paid: {formatRupee(monthlyPaidRevenue)}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600">Pending: {formatRupee(monthlyPendingRevenue)}</span>
                  <span className="text-gray-400">({monthlyBills.length} Bills)</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 text-[#16A34A] rounded-full">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            {/* Today's Bills */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Invoices</span>
                <div className="text-2xl font-bold text-[#111827]">{todayBills.length} Bills</div>
                <div className="text-[10px] font-semibold flex gap-2">
                  <span className="text-green-600">Paid: {todayPaidCount}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600">Pending: {todayPendingCount}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-full">
                <Clock className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Grid Layout for Recent Bills & Activity Feed */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Recent Bills (Left 2 Columns) */}
            <div className="xl:col-span-2 border border-[#E5E7EB] rounded bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex justify-between items-center bg-slate-50">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Recent Bills</span>
                <Link 
                  to="/bill-history" 
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5"
                >
                  View History
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-[#E5E7EB] text-gray-600 font-semibold">
                      <th className="p-3 font-semibold">Bill No.</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Party / Customer</th>
                      <th className="p-3 font-semibold">Route</th>
                      <th className="p-3 font-semibold">Weight</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                      <th className="p-3 font-semibold text-center print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {recentBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400 font-medium bg-white">
                          No invoices created yet. Click "Quick Create Bill" to make your first entry.
                        </td>
                      </tr>
                    ) : (
                      recentBills.map((b) => (
                        <tr key={b.id || b.uuid} className="hover:bg-slate-50 font-medium">
                          <td className="p-3 font-mono font-bold text-gray-900">{b.bill_no}</td>
                          <td className="p-3 text-gray-500">
                            {b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="p-3 text-gray-800 truncate max-w-[200px]">{b.party_name}</td>
                          <td className="p-3 text-gray-600">
                            {b.from_location} &rarr; {b.to_location}
                          </td>
                          <td className="p-3 font-semibold">{b.total_weight} MT</td>
                          <td className="p-3 font-mono font-bold text-right text-gray-900">
                            {formatRupee(b.total_amount)}
                          </td>
                          <td className="p-3 text-center print:hidden flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/create-bill?edit=${b.id}`)}
                              title="Edit Bill"
                              className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#2563EB] rounded transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                navigate(`/create-bill?duplicate=${b.id}`);
                              }}
                              title="Duplicate Bill"
                              className="p-1 hover:bg-slate-200 text-gray-600 hover:text-[#16A34A] rounded transition-colors text-[10px] font-bold"
                            >
                              DUP
                            </button>
                            <button
                              onClick={() => {
                                downloadBillPDF(`bill-preview-${b.id}`, `${b.bill_no}.pdf`);
                              }}
                              title="Download PDF"
                              className="p-1 hover:bg-slate-200 text-gray-600 hover:text-red-500 rounded transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Logs (Right 1 Column) */}
            <div className="border border-[#E5E7EB] rounded bg-white overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex justify-between items-center bg-slate-50">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Recent Activity Logs</span>
              </div>
              <div className="p-3 divide-y divide-[#E5E7EB] overflow-y-auto max-h-[350px] flex-1">
                {activityLogs.slice(0, 10).length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs font-medium">No actions logged yet.</div>
                ) : (
                  activityLogs.slice(0, 10).map((log) => (
                    <div key={log.id || log.created_at} className="py-2 first:pt-0 last:pb-0 text-xs space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">{log.action}</span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500 font-medium">
                        <span>Ref: {log.reference_id}</span>
                        <span>{log.created_at ? new Date(log.created_at).toLocaleDateString('en-GB') : ''}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
