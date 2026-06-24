1. settings
CREATE TABLE settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  company_name TEXT NOT NULL,
  address TEXT NOT NULL,

  email TEXT,

  phone_1 TEXT,
  phone_2 TEXT,
  phone_3 TEXT,

  gstin TEXT,
  pan TEXT,

  logo_url TEXT,
  signature_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
2. parties
CREATE TABLE parties (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  party_name TEXT NOT NULL UNIQUE,

  gst_number TEXT,

  address TEXT,

  city TEXT,
  state TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
3. trucks
CREATE TABLE trucks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  truck_no TEXT NOT NULL UNIQUE,

  owner_name TEXT,

  mobile TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
4. bills
CREATE TABLE bills (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  uuid UUID UNIQUE DEFAULT gen_random_uuid(),

  bill_no TEXT UNIQUE NOT NULL,

  party_id BIGINT REFERENCES parties(id),

  bill_date DATE NOT NULL,

  sub_date DATE,

  freight_amount NUMERIC DEFAULT 0,

  loading_charges NUMERIC DEFAULT 0,

  unloading_charges NUMERIC DEFAULT 0,

  detention_charges NUMERIC DEFAULT 0,

  other_charges NUMERIC DEFAULT 0,

  total_weight NUMERIC DEFAULT 0,

  total_amount NUMERIC DEFAULT 0,

  amount_in_words TEXT,

  notes TEXT,

  pdf_url TEXT,

  status TEXT DEFAULT 'Generated',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
5. truck_entries
CREATE TABLE truck_entries (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  uuid UUID UNIQUE DEFAULT gen_random_uuid(),

  bill_id BIGINT REFERENCES bills(id) ON DELETE CASCADE,

  truck_id BIGINT REFERENCES trucks(id),

  lr_no TEXT,

  entry_date DATE,

  from_location TEXT,

  to_location TEXT,

  weight NUMERIC DEFAULT 0,

  amount NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
6. users

Future proof.

CREATE TABLE users (
  id UUID PRIMARY KEY,

  full_name TEXT,

  email TEXT UNIQUE,

  role TEXT DEFAULT 'admin',

  created_at TIMESTAMPTZ DEFAULT NOW()
);
7. activity_logs

Har action track hoga.

CREATE TABLE activity_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  user_id UUID,

  action TEXT,

  reference_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
Required Indexes
CREATE INDEX idx_bill_no
ON bills(bill_no);

CREATE INDEX idx_bill_date
ON bills(bill_date);

CREATE INDEX idx_party_id
ON bills(party_id);

CREATE INDEX idx_truck_no
ON trucks(truck_no);

CREATE INDEX idx_bill_truck
ON truck_entries(bill_id);
Auto Update Trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER settings_updated
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER parties_updated
BEFORE UPDATE ON parties
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trucks_updated
BEFORE UPDATE ON trucks
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER bills_updated
BEFORE UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
Storage Buckets

Supabase Storage:

company-assets

Store:

logo.png
signature.png
bill-pdfs

Store:

JMVT0001.pdf
JMVT0002.pdf
JMVT0003.pdf
Bill Status Flow
Draft
Generated
Paid
Cancelled
Dashboard Metrics

Direct SQL friendly:

Today's Bills

This Month Bills

Total Revenue

Pending Bills

Paid Bills

Recent Activity
Killer Feature

Bill History table:

View
Edit
Duplicate
Delete
Download PDF
Print
WhatsApp Share

WhatsApp share button:

Generate PDF
↓
Upload to Storage
↓
Copy Public URL
↓
Open WhatsAppEnable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
SETTINGS POLICIES
Read
CREATE POLICY "Authenticated users can read settings"
ON settings
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert settings"
ON settings
FOR INSERT
TO authenticated
WITH CHECK (true);
Update
CREATE POLICY "Authenticated users can update settings"
ON settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete settings"
ON settings
FOR DELETE
TO authenticated
USING (true);
PARTIES POLICIES
Read
CREATE POLICY "Authenticated users can read parties"
ON parties
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert parties"
ON parties
FOR INSERT
TO authenticated
WITH CHECK (true);
Update
CREATE POLICY "Authenticated users can update parties"
ON parties
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete parties"
ON parties
FOR DELETE
TO authenticated
USING (true);
TRUCKS POLICIES
Read
CREATE POLICY "Authenticated users can read trucks"
ON trucks
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert trucks"
ON trucks
FOR INSERT
TO authenticated
WITH CHECK (true);
Update
CREATE POLICY "Authenticated users can update trucks"
ON trucks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete trucks"
ON trucks
FOR DELETE
TO authenticated
USING (true);
BILLS POLICIES
Read
CREATE POLICY "Authenticated users can read bills"
ON bills
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert bills"
ON bills
FOR INSERT
TO authenticated
WITH CHECK (true);
Update
CREATE POLICY "Authenticated users can update bills"
ON bills
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete bills"
ON bills
FOR DELETE
TO authenticated
USING (true);
TRUCK ENTRIES POLICIES
Read
CREATE POLICY "Authenticated users can read truck entries"
ON truck_entries
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert truck entries"
ON truck_entries
FOR INSERT
TO authenticated
WITH CHECK (true);
Update
CREATE POLICY "Authenticated users can update truck entries"
ON truck_entries
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete truck entries"
ON truck_entries
FOR DELETE
TO authenticated
USING (true);
ACTIVITY LOGS POLICIES
Read
CREATE POLICY "Authenticated users can read activity logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (true);
Insert
CREATE POLICY "Authenticated users can insert activity logs"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
Update (optional)
CREATE POLICY "Authenticated users can update activity logs"
ON activity_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
Delete
CREATE POLICY "Authenticated users can delete activity logs"
ON activity_logs
FOR DELETE
TO authenticated
USING (true);
STORAGE BUCKET POLICIES
company-assets bucket
logo.png
signature.png

Storage policy:

CREATE POLICY "Authenticated users upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "Authenticated users view company assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets');
bill-pdfs bucket
JMVT0001.pdf
JMVT0002.pdf

Upload:

CREATE POLICY "Authenticated users upload bill pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-pdfs');

Read:

CREATE POLICY "Authenticated users view bill pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bill-pdfs');

Delete:

CREATE POLICY "Authenticated users delete bill pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'bill-pdfs');