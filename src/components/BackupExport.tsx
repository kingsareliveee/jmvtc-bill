import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';

export const BackupExport: React.FC = () => {
  const { bills, parties, settings, fetchInitialData, isOfflineMode } = useTransportStore();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Helper to trigger file downloads
  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to convert arrays to CSV strings
  const convertToCSV = (headers: string[], rows: any[][]): string => {
    return [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""').replace(/\n/g, ' ');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');
  };

  // 1. Export Bills to CSV
  const handleExportBillsCSV = () => {
    if (bills.length === 0) {
      alert('No bills available to export.');
      return;
    }

    const headers = [
      'Bill No', 'Date', 'Party Name', 'GSTIN', 'Address', 'City', 'State', 
      'LR No', 'From', 'To', 'Total Weight (MT)', 'Freight', 
      'Loading', 'Unloading', 'Detention', 'Other Charges', 'Grand Total', 'Notes'
    ];

    const rows = bills.map(b => [
      b.bill_no,
      b.bill_date,
      b.party_name,
      b.gst_number,
      b.address,
      b.city,
      b.state,
      b.lr_no,
      b.from_location,
      b.to_location,
      b.total_weight,
      b.freight_amount,
      b.loading_charges,
      b.unloading_charges,
      b.detention_charges,
      b.other_charges,
      b.total_amount,
      b.notes
    ]);

    const csvContent = convertToCSV(headers, rows);
    downloadFile(csvContent, `JMVT_Bills_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Bills CSV exported successfully');
  };

  // 2. Export Parties to CSV
  const handleExportPartiesCSV = () => {
    if (parties.length === 0) {
      alert('No parties available to export.');
      return;
    }

    const headers = ['Party Name', 'GSTIN', 'Address', 'City', 'State'];
    const rows = parties.map(p => [
      p.party_name,
      p.gst_number,
      p.address,
      p.city,
      p.state
    ]);

    const csvContent = convertToCSV(headers, rows);
    downloadFile(csvContent, `JMVT_Parties_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Parties CSV exported successfully');
  };

  // 3. Export System JSON Backup
  const handleExportJSONBackup = () => {
    const backupData = {
      backup_version: '1.0',
      exported_at: new Date().toISOString(),
      settings: settings,
      parties: parties,
      bills: bills
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    downloadFile(jsonContent, `JMVT_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json;');
    showSuccess('Full JSON backup downloaded');
  };

  // 4. Import System JSON Backup
  const handleImportJSONBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Importing this file will overwrite duplicate records and load the backup into the system. Are you sure you want to proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data.bills || !data.parties) {
          throw new Error('Invalid backup file format: missing bills or parties data');
        }

        if (isOfflineMode) {
          // Local Storage Merge & Import
          const localBills = JSON.parse(localStorage.getItem('jmvt_bills') || '[]');
          const localParties = JSON.parse(localStorage.getItem('jmvt_parties') || '[]');

          // Merge Bills (avoid duplicate bill_no)
          const mergedBills = [...localBills];
          data.bills.forEach((b: any) => {
            if (!mergedBills.some((mb: any) => mb.bill_no === b.bill_no)) {
              mergedBills.push(b);
            }
          });

          // Merge Parties (avoid duplicate party_name)
          const mergedParties = [...localParties];
          data.parties.forEach((p: any) => {
            if (!mergedParties.some((mp: any) => mp.party_name.toLowerCase() === p.party_name.toLowerCase())) {
              mergedParties.push(p);
            }
          });

          localStorage.setItem('jmvt_bills', JSON.stringify(mergedBills));
          localStorage.setItem('jmvt_parties', JSON.stringify(mergedParties));
          if (data.settings) {
            localStorage.setItem('jmvt_settings', JSON.stringify(data.settings));
          }

          showSuccess('Backup data successfully loaded into local storage!');
        } else {
          // Supabase connection import is supported via settings syncing or direct inserts
          setErrorMsg('To import backups into Supabase, run the tables creation SQL, configure Supabase settings, and click "Migrate Local Data to Cloud" under Settings.');
          setTimeout(() => setErrorMsg(null), 8000);
          return;
        }

        // Refresh Store data
        await fetchInitialData();
        // Reset file input
        e.target.value = '';
      } catch (err: any) {
        setErrorMsg('Import failed: ' + err.message);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Backup & Export Ledger</h2>
        <p className="text-xs text-gray-500 font-medium">Export transport bills to spreadsheet CSV, download complete backups, or restore previous system logs</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-[#16A34A] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-[#DC2626] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Spreadsheet Export Card */}
        <div className="bg-white border border-[#E5E7EB] rounded p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
            Spreadsheet CSV Exports
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Export database records to Excel-compatible comma-separated value (CSV) formats for monthly business audits and accounting.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleExportBillsCSV}
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Invoices to CSV
            </button>

            <button
              onClick={handleExportPartiesCSV}
              className="w-full bg-white border border-[#E5E7EB] hover:bg-slate-50 text-gray-700 font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-gray-400" />
              Export Parties / Customers to CSV
            </button>
          </div>
        </div>

        {/* JSON Backup & Restore Card */}
        <div className="bg-white border border-[#E5E7EB] rounded p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#2563EB]" />
            System Backup & Restore
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Download a full JSON database backup containing all bills, truck entries, parties, and company settings, which can be restored on another device.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleExportJSONBackup}
              className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-gray-700 font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <FileCode className="w-4 h-4 text-amber-500" />
              Backup Database
            </button>

            <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#E5E7EB]">
              <Upload className="w-4 h-4 text-gray-500" />
              Restore Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJSONBackup}
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};
