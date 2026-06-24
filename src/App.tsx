import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTransportStore } from './store/useTransportStore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CreateBill } from './components/CreateBill';
import { BillHistory } from './components/BillHistory';
import { PartyMaster } from './components/PartyMaster';
import { TruckMaster } from './components/TruckMaster';
import { Settings } from './components/Settings';
import { BackupExport } from './components/BackupExport';

function App() {
  const { fetchInitialData } = useTransportStore();

  // Fetch data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-bill" element={<CreateBill />} />
          <Route path="/bill-history" element={<BillHistory />} />
          <Route path="/party-master" element={<PartyMaster />} />
          <Route path="/truck-master" element={<TruckMaster />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/backup-export" element={<BackupExport />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
