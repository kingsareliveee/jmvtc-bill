import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { useTransportStore } from '../store/useTransportStore';
import type { CompanySettings } from '../store/useTransportStore';
import { supabase } from '../lib/supabase';

export const Settings: React.FC = () => {
  const { settings, saveSettings, isOfflineMode, testSupabaseConnection, syncLocalDataToSupabase } = useTransportStore();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Supabase URL & Key from env or local config
  const [dbUrl, setDbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('jmvt_supabase_url') || '');
  const [dbKey, setDbKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('jmvt_supabase_anon_key') || '');

  const { register, handleSubmit, reset } = useForm<CompanySettings>({
    defaultValues: settings
  });

  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const onSubmit = async (data: CompanySettings) => {
    try {
      await saveSettings(data);
      showSuccess('Company settings saved successfully');
    } catch (err: any) {
      setErrorMsg('Failed to save settings: ' + err.message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // File Upload Helper (Uploads directly to company-assets bucket in Supabase if not offline)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'signature_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please select an image under 2MB.');
      return;
    }

    if (isOfflineMode) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        if (base64String) {
          await saveSettings({ [field]: base64String });
          showSuccess(`${field === 'logo_url' ? 'Logo' : 'Signature'} updated successfully (Local)`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');
        const fileName = field === 'logo_url' ? 'logo.png' : 'signature.png';

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(fileName, file, {
            upsert: true,
            contentType: file.type
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('company-assets')
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        await saveSettings({ [field]: publicUrl });
        showSuccess(`${field === 'logo_url' ? 'Logo' : 'Signature'} updated and saved successfully`);
      } catch (err: any) {
        setErrorMsg('Failed to upload image: ' + err.message);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    }
  };

  // Test and configure Supabase client-side
  const handleConnectSupabase = async () => {
    if (!dbUrl.trim() || !dbKey.trim()) {
      alert('Please fill out both Supabase URL and Anon Key');
      return;
    }

    setTestingConnection(true);
    setErrorMsg(null);

    const ok = await testSupabaseConnection(dbUrl, dbKey);
    setTestingConnection(false);

    if (ok) {
      localStorage.setItem('jmvt_supabase_url', dbUrl);
      localStorage.setItem('jmvt_supabase_anon_key', dbKey);
      
      // Save it and prompt reload/sync
      showSuccess('Connection successful! Settings saved. Please reload page.');
      
      // Trigger a state change
      useTransportStore.setState({ isOfflineMode: false });
      window.location.reload();
    } else {
      setErrorMsg('Could not establish connection to Supabase. Check keys and table structure.');
    }
  };

  const handleSyncData = async () => {
    if (window.confirm('This will upload all local invoices, parties and configurations into your Supabase database and clear local offline storage. Do you want to proceed?')) {
      setSyncing(true);
      try {
        await syncLocalDataToSupabase();
        showSuccess('Offline data successfully migrated to Supabase Cloud!');
      } catch (err: any) {
        setErrorMsg('Sync failed: ' + err.message);
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Disconnect from Supabase? This will return the application to offline-only local storage mode.')) {
      localStorage.removeItem('jmvt_supabase_url');
      localStorage.removeItem('jmvt_supabase_anon_key');
      useTransportStore.setState({ isOfflineMode: true });
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
        <p className="text-xs text-gray-500 font-medium">Configure company invoicing headers, logos, signatures and database integrations</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Company Details Form */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <SettingsIcon className="w-4 h-4 text-[#2563EB]" />
            Company Profile Settings
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Company Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Company Name</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-bold text-gray-900"
                {...register('company_name', { required: true })}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Address</label>
              <textarea
                rows={2}
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                {...register('address', { required: true })}
              />
            </div>

            {/* Contacts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number 1</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  {...register('phone_1')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number 2</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  {...register('phone_2')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number 3</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  {...register('phone_3')}
                />
              </div>
            </div>

            {/* Tax Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Company Email</label>
                <input
                  type="email"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-medium"
                  {...register('email')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GSTIN</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-bold text-gray-800"
                  {...register('gstin')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PAN Number</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono uppercase font-bold text-gray-800"
                  {...register('pan')}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded transition-colors"
            >
              Save Profile Settings
            </button>
          </form>

          {/* Logo & Signature Upload Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-4 mt-2">
            
            {/* Logo Card */}
            <div className="border border-[#E5E7EB] rounded p-3 space-y-2 bg-slate-50/50">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Company Logo</span>
              <div className="flex items-center gap-3">
                <img 
                  src={settings.logo_url || '/logo.png'} 
                  alt="Logo" 
                  className="w-12 h-12 object-contain bg-white border border-[#E5E7EB] rounded"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <label className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2.5 py-1.5 rounded text-[11px] font-semibold text-gray-600 hover:bg-slate-50 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo_url')}
                  />
                </label>
              </div>
            </div>

            {/* Signature Card */}
            <div className="border border-[#E5E7EB] rounded p-3 space-y-2 bg-slate-50/50">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Proprietor Signature</span>
              <div className="flex items-center gap-3">
                {settings.signature_url ? (
                  <img 
                    src={settings.signature_url} 
                    alt="Signature" 
                    className="w-24 h-10 object-contain bg-white border border-[#E5E7EB] rounded"
                  />
                ) : (
                  <div className="w-24 h-10 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 font-mono italic">
                    Default Sign
                  </div>
                )}
                <label className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2.5 py-1.5 rounded text-[11px] font-semibold text-gray-600 hover:bg-slate-50 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Sign
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'signature_url')}
                  />
                </label>
              </div>
            </div>

          </div>

        </div>

        {/* Database & Supabase Integration Panel */}
        <div className="lg:col-span-1 bg-white border border-[#E5E7EB] rounded p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#2563EB]" />
            Supabase Connection
          </h3>

          <div className="text-xs space-y-2 text-gray-500 font-medium">
            <p>
              By default, this app stores records in the browser's local cache. Connect a Supabase instance to enable multi-device synchronization.
            </p>
            <div className="flex items-center gap-1.5 font-bold">
              <span>Status:</span>
              {isOfflineMode ? (
                <span className="text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded text-[10px]">Offline (Local)</span>
              ) : (
                <span className="text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded text-[10px]">Connected (Supabase)</span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supabase URL</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono text-gray-800"
                placeholder="https://your-project.supabase.co"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supabase Anon Key</label>
              <input
                type="password"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs focus:outline-none focus:border-[#2563EB] font-mono text-gray-800"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={dbKey}
                onChange={(e) => setDbKey(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleConnectSupabase}
                disabled={testingConnection}
                className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded transition-colors flex items-center justify-center gap-1"
              >
                {testingConnection ? 'Testing Connection...' : 'Test & Connect'}
              </button>
              
              {!isOfflineMode && (
                <button
                  type="button"
                  onClick={handleDisconnectSupabase}
                  className="w-full bg-white border border-[#DC2626] text-[#DC2626] hover:bg-red-50 font-bold text-xs py-2 px-4 rounded transition-colors"
                >
                  Disconnect Database
                </button>
              )}
            </div>
          </div>

          {/* Sync Box (Available only if offline mode has data & Supabase has config values) */}
          {isOfflineMode && (
            <div className="border border-[#E5E7EB] bg-slate-50/50 rounded p-3 mt-4 space-y-2">
              <span className="block text-[10px] font-bold text-gray-600 uppercase flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin-slow" />
                Data Migration Sync
              </span>
              <p className="text-[10px] text-gray-400">
                You have offline data stored locally. Set up your Supabase connection above, then click below to migrate your local data to Supabase.
              </p>
              <button
                type="button"
                onClick={handleSyncData}
                disabled={syncing || !dbUrl || !dbKey}
                className="w-full bg-slate-100 hover:bg-[#16A34A] hover:text-white text-gray-700 border border-[#E5E7EB] font-bold text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-gray-700"
              >
                {syncing ? 'Syncing...' : 'Migrate Local Data to Cloud'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
