import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Truck {
  id?: number;
  truck_no: string;
  owner_name?: string;
  mobile?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TruckEntry {
  id?: number;
  uuid?: string;
  bill_id?: number;
  truck_id?: number | null;
  lr_no?: string;
  entry_date?: string;
  from_location?: string;
  to_location?: string;
  weight?: number;
  amount?: number;
  created_at?: string;

  // Flattened/UI fields loaded from trucks table
  truck_no?: string;
}

export interface Bill {
  id?: number;
  uuid?: string;
  bill_no: string;
  party_id?: number | null;
  bill_date: string;
  lr_no: string;
  sub_date?: string | null;
  freight_amount: number;
  loading_charges: number;
  unloading_charges: number;
  detention_charges: number;
  other_charges: number;
  total_weight: number;
  total_amount: number;
  amount_in_words: string;
  notes: string;
  pdf_url?: string | null;
  status?: string; // Draft, Generated, Paid, Cancelled
  created_at?: string;
  updated_at?: string;

  // Flattened/UI fields loaded from parties table
  party_name?: string;
  gst_number?: string;
  address?: string;
  city?: string;
  state?: string;

  // Joined truck entries
  truck_entries?: TruckEntry[];
  from_location?: string; // Derived from main/entries
  to_location?: string;   // Derived from main/entries
}

export interface Party {
  id?: number;
  party_name: string;
  gst_number: string;
  address: string;
  city: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettings {
  id?: number;
  company_name: string;
  address: string;
  email: string;
  phone_1: string;
  phone_2: string;
  phone_3: string;
  gstin: string;
  pan: string;
  logo_url: string;
  signature_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id?: number;
  user_id?: string;
  action: string;
  reference_id: string;
  created_at?: string;
}

interface TransportStore {
  bills: Bill[];
  parties: Party[];
  trucks: Truck[]; // Table data
  activityLogs: ActivityLog[];
  settings: CompanySettings;
  isLoading: boolean;
  error: string | null;
  isOfflineMode: boolean;

  // Actions
  fetchInitialData: () => Promise<void>;
  saveSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  addBill: (
    bill: Omit<Bill, 'id' | 'uuid' | 'created_at' | 'updated_at'>, 
    truckEntries: Omit<TruckEntry, 'id' | 'uuid' | 'bill_id'>[],
    pdfBlob?: Blob
  ) => Promise<Bill | null>;
  updateBill: (
    id: number, 
    bill: Partial<Bill>, 
    truckEntries: (Omit<TruckEntry, 'uuid' | 'bill_id'> & { id?: number })[],
    pdfBlob?: Blob
  ) => Promise<boolean>;
  deleteBill: (id: number) => Promise<boolean>;
  addParty: (party: Omit<Party, 'id' | 'created_at' | 'updated_at'>) => Promise<Party | null>;
  updateParty: (id: number, party: Partial<Party>) => Promise<boolean>;
  deleteParty: (id: number) => Promise<boolean>;
  addTruck: (truck: Omit<Truck, 'id' | 'created_at' | 'updated_at'>) => Promise<Truck | null>;
  deleteTruck: (id: number) => Promise<boolean>;
  getNextBillNumber: () => string;
  logActivity: (action: string, referenceId: string) => Promise<void>;
  testSupabaseConnection: (url: string, anonKey: string) => Promise<boolean>;
  syncLocalDataToSupabase: () => Promise<void>;
}

// Default settings. GSTIN and PAN are empty as per client branding update
const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'JAI MAA VAISHNAV TRANSPORT COMPANY',
  address: 'D.No. 5, 222-B, New Loha Mandi, Dewas Naka, Indore - 452010',
  email: 'jaimaavaishnavtransport@gmail.com',
  phone_1: '+91 9179124955',
  phone_2: '+91 9826028155',
  phone_3: '+91 9179448155',
  gstin: '', // Removed placeholder
  pan: '',   // Removed placeholder
  logo_url: '',
  signature_url: ''
};

export const useTransportStore = create<TransportStore>((set, get) => ({
  bills: [],
  parties: [],
  trucks: [],
  activityLogs: [],
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,
  isOfflineMode: !isSupabaseConfigured,

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    const { isOfflineMode } = get();

    if (isOfflineMode) {
      try {
        const storedBills = localStorage.getItem('jmvt_bills_v2');
        const storedParties = localStorage.getItem('jmvt_parties_v2');
        const storedTrucks = localStorage.getItem('jmvt_trucks_v2');
        const storedSettings = localStorage.getItem('jmvt_settings_v2');
        const storedLogs = localStorage.getItem('jmvt_logs_v2');

        const bills: Bill[] = storedBills ? JSON.parse(storedBills) : [];
        const parties: Party[] = storedParties ? JSON.parse(storedParties) : [];
        const trucks: Truck[] = storedTrucks ? JSON.parse(storedTrucks) : [];
        const logs: ActivityLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const settings: CompanySettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;

        set({
          bills,
          parties,
          trucks,
          activityLogs: logs,
          settings,
          isLoading: false
        });
      } catch (err: any) {
        set({ error: 'Failed to read local database: ' + err.message, isLoading: false });
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Fetch settings
        const { data: dbSettings, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .order('id', { ascending: false })
          .limit(1);

        let finalSettings = DEFAULT_SETTINGS;
        if (!settingsError && dbSettings && dbSettings.length > 0) {
          finalSettings = dbSettings[0] as CompanySettings;
        } else if (!settingsError) {
          // Seed settings if empty
          const { data: insertedSettings } = await supabase
            .from('settings')
            .insert([DEFAULT_SETTINGS])
            .select();
          if (insertedSettings && insertedSettings.length > 0) {
            finalSettings = insertedSettings[0] as CompanySettings;
          }
        }

        // 2. Fetch parties
        const { data: dbParties, error: partiesError } = await supabase
          .from('parties')
          .select('*')
          .order('party_name', { ascending: true });

        if (partiesError) throw partiesError;

        // 3. Fetch trucks
        const { data: dbTrucks, error: trucksError } = await supabase
          .from('trucks')
          .select('*')
          .order('truck_no', { ascending: true });

        if (trucksError) throw trucksError;

        // 4. Fetch activity logs
        const { data: dbLogs } = await supabase
          .from('activity_logs')
          .select('*')
          .order('id', { ascending: false })
          .limit(50);

        // 5. Fetch bills with relations
        const { data: dbBills, error: billsError } = await supabase
          .from('bills')
          .select(`
            *,
            parties (*),
            truck_entries (
              *,
              trucks (*)
            )
          `)
          .order('id', { ascending: false });

        if (billsError) throw billsError;

        // Map and flatten joined bills for UI compatibility
        const billsList = (dbBills as any[] || []).map(b => {
          // Derive locations from first truck entry if main location fields are empty
          const firstEntry = b.truck_entries?.[0];
          const fromLoc = b.from_location || firstEntry?.from_location || '';
          const toLoc = b.to_location || firstEntry?.to_location || '';

          return {
            ...b,
            party_name: b.parties?.party_name || '',
            gst_number: b.parties?.gst_number || '',
            address: b.parties?.address || '',
            city: b.parties?.city || '',
            state: b.parties?.state || '',
            from_location: fromLoc,
            to_location: toLoc,
            truck_entries: b.truck_entries?.map((te: any) => ({
              ...te,
              truck_no: te.trucks?.truck_no || ''
            })) || []
          };
        }) as Bill[];

        set({
          bills: billsList,
          parties: dbParties as Party[],
          trucks: dbTrucks as Truck[],
          activityLogs: dbLogs || [],
          settings: finalSettings,
          isLoading: false
        });
      } catch (err: any) {
        console.error('Supabase fetch failed, fallback to local storage.', err);
        set({ isOfflineMode: true, isLoading: false });
        get().fetchInitialData();
      }
    }
  },

  logActivity: async (action, referenceId) => {
    const { isOfflineMode, activityLogs } = get();
    const newLog: ActivityLog = {
      action,
      reference_id: referenceId,
      created_at: new Date().toISOString()
    };

    if (isOfflineMode) {
      const updatedLogs = [newLog, ...activityLogs].slice(0, 50);
      localStorage.setItem('jmvt_logs_v2', JSON.stringify(updatedLogs));
      set({ activityLogs: updatedLogs });
    } else {
      try {
        if (supabase) {
          await supabase.from('activity_logs').insert({
            action,
            reference_id: referenceId
          });
        }
      } catch (err) {
        console.error('Activity logging failed:', err);
      }
    }
  },

  saveSettings: async (newSettings) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, settings } = get();
    
    // Remove database timestamps
    const { created_at, updated_at, ...cleanPayload } = newSettings;
    const updated = { ...settings, ...cleanPayload };

    if (isOfflineMode) {
      localStorage.setItem('jmvt_settings_v2', JSON.stringify(updated));
      set({ settings: updated, isLoading: false });
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        let result;
        if (settings.id) {
          result = await supabase
            .from('settings')
            .update(cleanPayload)
            .eq('id', settings.id)
            .select();
        } else {
          result = await supabase
            .from('settings')
            .insert([updated])
            .select();
        }

        if (result.error) throw result.error;
        if (result.data && result.data.length > 0) {
          set({ settings: result.data[0] as CompanySettings });
        } else {
          set({ settings: updated });
        }
        await get().logActivity('Updated Settings', 'Company Profile');
        set({ isLoading: false });
      } catch (err: any) {
        set({ error: 'Failed to save settings: ' + err.message, isLoading: false });
      }
    }
  },

  addBill: async (billData, truckEntriesData, pdfBlob) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, bills, parties, trucks } = get();

    // Map UI values directly if running offline
    if (isOfflineMode) {
      try {
        const newId = bills.length > 0 ? Math.max(...bills.map(b => b.id || 0)) + 1 : 1;
        
        // Auto resolve local party
        let localParty = parties.find(p => p.party_name.toLowerCase() === billData.party_name?.toLowerCase());
        if (!localParty && billData.party_name) {
          localParty = {
            id: parties.length + 1,
            party_name: billData.party_name,
            gst_number: billData.gst_number || '',
            address: billData.address || '',
            city: billData.city || '',
            state: billData.state || ''
          };
          localStorage.setItem('jmvt_parties_v2', JSON.stringify([...parties, localParty]));
        }

        // Map truck entries
        const mappedEntries = truckEntriesData.map((t, idx) => {
          let localTruck = trucks.find(tr => tr.truck_no.toUpperCase() === t.truck_no?.toUpperCase());
          if (!localTruck && t.truck_no) {
            localTruck = { id: trucks.length + idx + 1, truck_no: t.truck_no.toUpperCase() };
            // append locally (for this session)
            trucks.push(localTruck);
          }
          return {
            ...t,
            id: idx + 1,
            bill_id: newId,
            truck_id: localTruck?.id || null
          };
        });

        localStorage.setItem('jmvt_trucks_v2', JSON.stringify(trucks));

        const newBill: Bill = {
          ...billData,
          id: newId,
          party_id: localParty?.id || null,
          uuid: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          truck_entries: mappedEntries
        };

        const updatedBills = [newBill, ...bills];
        localStorage.setItem('jmvt_bills_v2', JSON.stringify(updatedBills));

        set({ bills: updatedBills, parties: [...parties, ...(localParty ? [localParty] : [])], trucks: [...trucks], isLoading: false });
        get().logActivity('Created Invoice', billData.bill_no);
        return newBill;
      } catch (err: any) {
        set({ error: 'Failed to create bill locally: ' + err.message, isLoading: false });
        return null;
      }
    } else {
      // Supabase Mode
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Resolve Party (find or insert)
        let resolvedPartyId: number | null = null;
        if (billData.party_name) {
          const matched = parties.find(p => p.party_name.toLowerCase() === billData.party_name?.toLowerCase());
          if (matched && matched.id) {
            resolvedPartyId = matched.id;
          } else {
            const { data: newParty, error: partyError } = await supabase
              .from('parties')
              .insert({
                party_name: billData.party_name,
                gst_number: billData.gst_number || '',
                address: billData.address || '',
                city: billData.city || '',
                state: billData.state || ''
              })
              .select();

            if (partyError) throw partyError;
            if (newParty && newParty.length > 0) {
              resolvedPartyId = newParty[0].id;
              // refresh parties list locally
              set({ parties: [...parties, newParty[0] as Party] });
            }
          }
        }

        // 2. Upload PDF to Storage if provided
        let pdfUrl = null;
        if (pdfBlob) {
          const fileName = `${billData.bill_no}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('bill-pdfs')
            .upload(fileName, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('bill-pdfs')
              .getPublicUrl(fileName);
            pdfUrl = urlData.publicUrl;
          } else {
            console.error('PDF Storage upload failed:', uploadError);
          }
        }

        // 3. Insert Bill (excluding temp UI flat fields)
        const { party_name, gst_number, address, city, state, from_location, to_location, ...dbBillFields } = billData as any;
        const { error: billInsertErr, data: insertedBill } = await supabase
          .from('bills')
          .insert({
            ...dbBillFields,
            party_id: resolvedPartyId,
            pdf_url: pdfUrl
          })
          .select();

        if (billInsertErr) throw billInsertErr;
        if (!insertedBill || insertedBill.length === 0) throw new Error('Failed to insert bill metadata record');

        const dbBillId = insertedBill[0].id;

        // 4. Resolve Trucks and Insert Entries
        const dbTruckEntries: TruckEntry[] = [];
        for (const t of truckEntriesData) {
          if (!t.truck_no) continue;
          
          let resolvedTruckId: number | null = null;
          const matchedTruck = trucks.find(tr => tr.truck_no.toUpperCase() === t.truck_no?.toUpperCase());
          
          if (matchedTruck && matchedTruck.id) {
            resolvedTruckId = matchedTruck.id;
          } else {
            // Insert truck
            const { data: newTruck, error: truckErr } = await supabase
              .from('trucks')
              .insert({ truck_no: t.truck_no.toUpperCase() })
              .select();

            if (truckErr) throw truckErr;
            if (newTruck && newTruck.length > 0) {
              resolvedTruckId = newTruck[0].id;
              // refresh local cache
              set(state => ({ trucks: [...state.trucks, newTruck[0] as Truck] }));
            }
          }

          // Insert Entry referencing resolvedTruckId
          const { truck_no, ...cleanEntry } = t as any;
          const { data: insertedEntry, error: teErr } = await supabase
            .from('truck_entries')
            .insert({
              ...cleanEntry,
              bill_id: dbBillId,
              truck_id: resolvedTruckId
            })
            .select();

          if (teErr) throw teErr;
          if (insertedEntry && insertedEntry.length > 0) {
            dbTruckEntries.push({
              ...insertedEntry[0],
              truck_no: t.truck_no.toUpperCase()
            });
          }
        }

        const newBillRecord: Bill = {
          ...insertedBill[0],
          party_name: billData.party_name,
          gst_number: billData.gst_number,
          address: billData.address,
          city: billData.city,
          state: billData.state,
          truck_entries: dbTruckEntries
        };

        set({ bills: [newBillRecord, ...bills], isLoading: false });
        await get().logActivity('Created Invoice', billData.bill_no);
        return newBillRecord;
      } catch (err: any) {
        set({ error: 'Database write failed: ' + err.message, isLoading: false });
        return null;
      }
    }
  },

  updateBill: async (id, billData, truckEntriesData: (Omit<TruckEntry, 'uuid' | 'bill_id'> & { id?: number })[], pdfBlob) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, bills, parties, trucks } = get();

    if (isOfflineMode) {
      try {
        // Resolve Party
        let localParty = parties.find(p => p.party_name.toLowerCase() === billData.party_name?.toLowerCase());
        if (!localParty && billData.party_name) {
          localParty = {
            id: parties.length + 1,
            party_name: billData.party_name,
            gst_number: billData.gst_number || '',
            address: billData.address || '',
            city: billData.city || '',
            state: billData.state || ''
          };
          localStorage.setItem('jmvt_parties_v2', JSON.stringify([...parties, localParty]));
        }

        // Map entries
        const mappedEntries = truckEntriesData.map((t, idx) => {
          let localTruck = trucks.find(tr => tr.truck_no.toUpperCase() === t.truck_no?.toUpperCase());
          if (!localTruck && t.truck_no) {
            localTruck = { id: trucks.length + idx + 1, truck_no: t.truck_no.toUpperCase() };
            trucks.push(localTruck);
          }
          return {
            ...t,
            id: t.id || idx + 1000,
            bill_id: id,
            truck_id: localTruck?.id || null
          };
        });

        localStorage.setItem('jmvt_trucks_v2', JSON.stringify(trucks));

        const updatedBills = bills.map(b => {
          if (b.id === id) {
            return {
              ...b,
              ...billData,
              party_id: localParty?.id || b.party_id,
              updated_at: new Date().toISOString(),
              truck_entries: mappedEntries
            };
          }
          return b;
        });

        localStorage.setItem('jmvt_bills_v2', JSON.stringify(updatedBills));
        set({ bills: updatedBills, parties: [...parties, ...(localParty ? [localParty] : [])], trucks: [...trucks], isLoading: false });
        get().logActivity('Updated Invoice', billData.bill_no || '');
        return true;
      } catch (err: any) {
        set({ error: 'Failed to update bill locally: ' + err.message, isLoading: false });
        return false;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Resolve Party (find or insert)
        let resolvedPartyId: number | null = null;
        if (billData.party_name) {
          const matched = parties.find(p => p.party_name.toLowerCase() === billData.party_name?.toLowerCase());
          if (matched && matched.id) {
            resolvedPartyId = matched.id;
          } else {
            const { data: newParty, error: partyError } = await supabase
              .from('parties')
              .insert({
                party_name: billData.party_name,
                gst_number: billData.gst_number || '',
                address: billData.address || '',
                city: billData.city || '',
                state: billData.state || ''
              })
              .select();

            if (partyError) throw partyError;
            if (newParty && newParty.length > 0) {
              resolvedPartyId = newParty[0].id;
              set({ parties: [...parties, newParty[0] as Party] });
            }
          }
        }

        // 2. Upload PDF if provided
        let pdfUrl = billData.pdf_url || null;
        if (pdfBlob && billData.bill_no) {
          const fileName = `${billData.bill_no}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('bill-pdfs')
            .upload(fileName, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('bill-pdfs')
              .getPublicUrl(fileName);
            pdfUrl = urlData.publicUrl;
          }
        }

        // 3. Update main bill (excluding flat UI fields and timestamp logs)
        const { party_name, gst_number, address, city, state, from_location, to_location, created_at, updated_at, ...cleanBillFields } = billData as any;
        const { error: billUpdateErr } = await supabase
          .from('bills')
          .update({
            ...cleanBillFields,
            party_id: resolvedPartyId,
            pdf_url: pdfUrl
          })
          .eq('id', id);

        if (billUpdateErr) throw billUpdateErr;

        // 4. Delete old entries
        const { error: deleteEntriesErr } = await supabase
          .from('truck_entries')
          .delete()
          .eq('bill_id', id);

        if (deleteEntriesErr) throw deleteEntriesErr;

        // 5. Insert new entries
        const dbTruckEntries: TruckEntry[] = [];
        for (const t of truckEntriesData) {
          if (!t.truck_no) continue;

          let resolvedTruckId: number | null = null;
          const matchedTruck = trucks.find(tr => tr.truck_no.toUpperCase() === t.truck_no?.toUpperCase());

          if (matchedTruck && matchedTruck.id) {
            resolvedTruckId = matchedTruck.id;
          } else {
            // Insert truck
            const { data: newTruck, error: truckErr } = await supabase
              .from('trucks')
              .insert({ truck_no: t.truck_no.toUpperCase() })
              .select();

            if (truckErr) throw truckErr;
            if (newTruck && newTruck.length > 0) {
              resolvedTruckId = newTruck[0].id;
              set(state => ({ trucks: [...state.trucks, newTruck[0] as Truck] }));
            }
          }

          // Insert Entry
          const { truck_no, ...cleanEntry } = t as any;
          const { data: insertedEntry, error: teErr } = await supabase
            .from('truck_entries')
            .insert({
              ...cleanEntry,
              bill_id: id,
              truck_id: resolvedTruckId
            })
            .select();

          if (teErr) throw teErr;
          if (insertedEntry && insertedEntry.length > 0) {
            dbTruckEntries.push({
              ...insertedEntry[0],
              truck_no: t.truck_no.toUpperCase()
            });
          }
        }

        const updatedBills = bills.map(b => {
          if (b.id === id) {
            return {
              ...b,
              ...billData,
              party_id: resolvedPartyId,
              pdf_url: pdfUrl,
              truck_entries: dbTruckEntries
            };
          }
          return b;
        });

        set({ bills: updatedBills, isLoading: false });
        await get().logActivity('Updated Invoice', billData.bill_no || '');
        return true;
      } catch (err: any) {
        set({ error: 'Database update failed: ' + err.message, isLoading: false });
        return false;
      }
    }
  },

  deleteBill: async (id) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, bills } = get();
    const billToDelete = bills.find(b => b.id === id);

    if (isOfflineMode) {
      try {
        const updatedBills = bills.filter(b => b.id !== id);
        localStorage.setItem('jmvt_bills_v2', JSON.stringify(updatedBills));
        set({ bills: updatedBills, isLoading: false });
        if (billToDelete) {
          get().logActivity('Deleted Invoice (Local)', billToDelete.bill_no);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to delete bill: ' + err.message, isLoading: false });
        return false;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        // Delete from database
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Try to delete PDF from storage
        if (billToDelete?.bill_no) {
          const fileName = `${billToDelete.bill_no}.pdf`;
          await supabase.storage
            .from('bill-pdfs')
            .remove([fileName]);
        }

        set({
          bills: bills.filter(b => b.id !== id),
          isLoading: false
        });
        
        if (billToDelete) {
          await get().logActivity('Deleted Invoice', billToDelete.bill_no);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to delete database record: ' + err.message, isLoading: false });
        return false;
      }
    }
  },

  addParty: async (partyData) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, parties } = get();

    if (isOfflineMode) {
      try {
        const isDuplicate = parties.some(p => p.party_name.toLowerCase() === partyData.party_name.toLowerCase());
        if (isDuplicate) throw new Error('Party name already exists');

        const newId = parties.length > 0 ? Math.max(...parties.map(p => p.id || 0)) + 1 : 1;
        const newParty: Party = { ...partyData, id: newId };
        const updatedParties = [...parties, newParty].sort((a, b) => a.party_name.localeCompare(b.party_name));

        localStorage.setItem('jmvt_parties_v2', JSON.stringify(updatedParties));
        set({ parties: updatedParties, isLoading: false });
        get().logActivity('Registered Party (Local)', partyData.party_name);
        return newParty;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
          .from('parties')
          .insert([partyData])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Failed to create party');

        const newParty = data[0] as Party;
        const updatedParties = [...parties, newParty].sort((a, b) => a.party_name.localeCompare(b.party_name));

        set({ parties: updatedParties, isLoading: false });
        await get().logActivity('Registered Party', partyData.party_name);
        return newParty;
      } catch (err: any) {
        set({ error: 'Failed to create party record: ' + err.message, isLoading: false });
        return null;
      }
    }
  },

  updateParty: async (id, partyData) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, parties } = get();
    
    // Remove database timestamp
    const { created_at, updated_at, ...cleanPayload } = partyData as any;

    if (isOfflineMode) {
      try {
        const updatedParties = parties.map(p => (p.id === id ? { ...p, ...cleanPayload } : p))
          .sort((a, b) => a.party_name.localeCompare(b.party_name));

        localStorage.setItem('jmvt_parties_v2', JSON.stringify(updatedParties));
        set({ parties: updatedParties, isLoading: false });
        get().logActivity('Updated Party (Local)', partyData.party_name || '');
        return true;
      } catch (err: any) {
        set({ error: 'Failed to update party: ' + err.message, isLoading: false });
        return false;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { error } = await supabase
          .from('parties')
          .update(cleanPayload)
          .eq('id', id);

        if (error) throw error;

        const updatedParties = parties.map(p => (p.id === id ? { ...p, ...cleanPayload } : p))
          .sort((a, b) => a.party_name.localeCompare(b.party_name));

        set({ parties: updatedParties, isLoading: false });
        await get().logActivity('Updated Party', partyData.party_name || '');
        return true;
      } catch (err: any) {
        set({ error: 'Failed to update party record: ' + err.message, isLoading: false });
        return false;
      }
    }
  },

  deleteParty: async (id) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, parties } = get();
    const partyToDelete = parties.find(p => p.id === id);

    if (isOfflineMode) {
      try {
        const updatedParties = parties.filter(p => p.id !== id);
        localStorage.setItem('jmvt_parties_v2', JSON.stringify(updatedParties));
        set({ parties: updatedParties, isLoading: false });
        if (partyToDelete) {
          get().logActivity('Deleted Party (Local)', partyToDelete.party_name);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to delete party: ' + err.message, isLoading: false });
        return false;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { error } = await supabase
          .from('parties')
          .delete()
          .eq('id', id);

        if (error) throw error;

        set({
          parties: parties.filter(p => p.id !== id),
          isLoading: false
        });
        if (partyToDelete) {
          await get().logActivity('Deleted Party', partyToDelete.party_name);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to delete party record: ' + err.message, isLoading: false });
        return false;
      }
    }
  },

  addTruck: async (truckData) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, trucks } = get();

    if (isOfflineMode) {
      try {
        const isDuplicate = trucks.some(t => t.truck_no.toUpperCase() === truckData.truck_no.toUpperCase());
        if (isDuplicate) throw new Error('Truck already exists');

        const newId = trucks.length > 0 ? Math.max(...trucks.map(t => t.id || 0)) + 1 : 1;
        const newTruck: Truck = {
          ...truckData,
          id: newId,
          truck_no: truckData.truck_no.toUpperCase()
        };
        const updated = [...trucks, newTruck].sort((a, b) => a.truck_no.localeCompare(b.truck_no));

        localStorage.setItem('jmvt_trucks_v2', JSON.stringify(updated));
        set({ trucks: updated, isLoading: false });
        get().logActivity('Registered Truck (Local)', truckData.truck_no);
        return newTruck;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
          .from('trucks')
          .insert([{
            truck_no: truckData.truck_no.toUpperCase(),
            owner_name: truckData.owner_name || '',
            mobile: truckData.mobile || ''
          }])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Failed to register truck');

        const newTruck = data[0] as Truck;
        const updated = [...trucks, newTruck].sort((a, b) => a.truck_no.localeCompare(b.truck_no));

        set({ trucks: updated, isLoading: false });
        await get().logActivity('Registered Truck', truckData.truck_no);
        return newTruck;
      } catch (err: any) {
        set({ error: 'Failed to create truck record: ' + err.message, isLoading: false });
        return null;
      }
    }
  },

  deleteTruck: async (id) => {
    set({ isLoading: true, error: null });
    const { isOfflineMode, trucks } = get();
    const truckToDelete = trucks.find(t => t.id === id);

    if (isOfflineMode) {
      try {
        const updated = trucks.filter(t => t.id !== id);
        localStorage.setItem('jmvt_trucks_v2', JSON.stringify(updated));
        set({ trucks: updated, isLoading: false });
        if (truckToDelete) {
          get().logActivity('Removed Truck (Local)', truckToDelete.truck_no);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to remove truck: ' + err.message, isLoading: false });
        return false;
      }
    } else {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { error } = await supabase
          .from('trucks')
          .delete()
          .eq('id', id);

        if (error) throw error;

        set({
          trucks: trucks.filter(t => t.id !== id),
          isLoading: false
        });
        if (truckToDelete) {
          await get().logActivity('Removed Truck', truckToDelete.truck_no);
        }
        return true;
      } catch (err: any) {
        set({ error: 'Failed to remove truck record: ' + err.message, isLoading: false });
        return false;
      }
    }
  },

  getNextBillNumber: () => {
    const { bills } = get();
    if (bills.length === 0) return 'JMVT0001';

    // Parse JMVT\d+
    const numbers = bills
      .map(b => {
        const match = b.bill_no.match(/JMVT(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    if (numbers.length === 0) {
      const fallbackNumbers = bills
        .map(b => {
          const match = b.bill_no.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null);
      if (fallbackNumbers.length === 0) return 'JMVT0001';
      const maxNum = Math.max(...fallbackNumbers);
      return `JMVT${String(maxNum + 1).padStart(4, '0')}`;
    }

    const maxNum = Math.max(...numbers);
    const nextNum = maxNum + 1;
    return `JMVT${String(nextNum).padStart(4, '0')}`;
  },

  syncLocalDataToSupabase: async () => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Sync Settings
    const storedSettings = localStorage.getItem('jmvt_settings_v2');
    if (storedSettings) {
      const settingsObj = JSON.parse(storedSettings);
      const { id, created_at, updated_at, ...cleanSettings } = settingsObj;
      const { data: currentSettings } = await supabase.from('settings').select('id').limit(1);
      if (currentSettings && currentSettings.length > 0) {
        await supabase.from('settings').update(cleanSettings).eq('id', currentSettings[0].id);
      } else {
        await supabase.from('settings').insert([cleanSettings]);
      }
    }

    // 2. Sync Parties
    const storedParties = localStorage.getItem('jmvt_parties_v2');
    if (storedParties) {
      const partiesList = JSON.parse(storedParties) as Party[];
      for (const party of partiesList) {
        const { id, created_at, updated_at, ...cleanParty } = party as any;
        const { data: matched } = await supabase.from('parties').select('id').eq('party_name', party.party_name).limit(1);
        if (!matched || matched.length === 0) {
          await supabase.from('parties').insert([cleanParty]);
        }
      }
    }

    // 3. Sync Trucks
    const storedTrucks = localStorage.getItem('jmvt_trucks_v2');
    if (storedTrucks) {
      const trucksList = JSON.parse(storedTrucks) as Truck[];
      for (const truck of trucksList) {
        const { id, created_at, updated_at, ...cleanTruck } = truck as any;
        const { data: matched } = await supabase.from('trucks').select('id').eq('truck_no', truck.truck_no).limit(1);
        if (!matched || matched.length === 0) {
          await supabase.from('trucks').insert([cleanTruck]);
        }
      }
    }

    // 4. Sync Bills & Truck Entries
    const storedBills = localStorage.getItem('jmvt_bills_v2');
    if (storedBills) {
      const billsList = JSON.parse(storedBills) as Bill[];
      const { data: dbParties } = await supabase.from('parties').select('*');
      const { data: dbTrucks } = await supabase.from('trucks').select('*');

      for (const bill of billsList) {
        const { data: existingBill } = await supabase.from('bills').select('id').eq('bill_no', bill.bill_no).limit(1);
        if (existingBill && existingBill.length > 0) continue;

        const matchedParty = dbParties?.find(p => p.party_name.toLowerCase() === bill.party_name?.toLowerCase());
        const resolvedPartyId = matchedParty?.id || null;

        const { party_name, gst_number, address, city, state, from_location, to_location, id, created_at, updated_at, truck_entries, ...dbBillFields } = bill as any;

        const { data: insertedBill, error: billErr } = await supabase
          .from('bills')
          .insert({
            ...dbBillFields,
            party_id: resolvedPartyId
          })
          .select();

        if (billErr || !insertedBill || insertedBill.length === 0) continue;
        const dbBillId = insertedBill[0].id;

        if (truck_entries && truck_entries.length > 0) {
          for (const te of truck_entries) {
            const matchedTruck = dbTrucks?.find(t => t.truck_no.toUpperCase() === te.truck_no?.toUpperCase());
            const resolvedTruckId = matchedTruck?.id || null;

            const { id: teId, truck_no, ...cleanTE } = te;
            await supabase.from('truck_entries').insert({
              ...cleanTE,
              bill_id: dbBillId,
              truck_id: resolvedTruckId
            });
          }
        }
      }
    }

    // Clear local storage and refresh data
    localStorage.removeItem('jmvt_bills_v2');
    localStorage.removeItem('jmvt_parties_v2');
    localStorage.removeItem('jmvt_trucks_v2');
    localStorage.removeItem('jmvt_logs_v2');

    await get().fetchInitialData();
  },

  testSupabaseConnection: async (url: string, anonKey: string) => {
    try {
      const client = createClient(url, anonKey);
      const { error } = await client.from('settings').select('company_name').limit(1);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  }
}));
