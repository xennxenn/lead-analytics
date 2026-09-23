import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'lead_sales_store.json');
const TMP_STORE_FILE = path.join('/tmp', 'lead_sales_store.json');

// Ensure data directory exists if possible
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignored in read-only environment
}

interface StoredData {
  mainRows: any[];
  statusRows: any[];
  salesRows: any[];
  adsGroups: any[];
  lastUpdated: string | null;
  isCleared?: boolean;
  hasInitialized?: boolean;
}

// Initial state loader with multi-path fallback (/tmp -> ./data)
function loadStoredData(): StoredData {
  try {
    if (fs.existsSync(TMP_STORE_FILE)) {
      const content = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Failed to read tmp store file:', err);
  }

  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Failed to read local store file:', err);
  }

  return {
    mainRows: [],
    statusRows: [],
    salesRows: [],
    adsGroups: [],
    lastUpdated: null,
    isCleared: false,
    hasInitialized: false,
  };
}

function saveStoredData(data: StoredData) {
  // Always update in-memory
  currentStore = data;

  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write to local store:', err);
  }

  try {
    fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Ignored in non-serverless
  }
}

let currentStore = loadStoredData();

// Enable basic CORS for serverless flexibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Endpoints (Support both /api/* and root /* for Vercel rewrites)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: process.env.VERCEL ? 'vercel' : 'node' });
});

app.get(['/api/data', '/data'], (req, res) => {
  try {
    currentStore = loadStoredData();
  } catch (err) {
    console.warn('Error reading stored data:', err);
  }
  res.json({
    success: true,
    data: currentStore,
  });
});

app.post(['/api/upload', '/upload'], (req, res) => {
  try {
    const { mainRows, statusRows, salesRows, adsGroups } = req.body;

    if (mainRows !== undefined) currentStore.mainRows = mainRows;
    if (statusRows !== undefined) currentStore.statusRows = statusRows;
    if (salesRows !== undefined) currentStore.salesRows = salesRows;
    if (adsGroups !== undefined && adsGroups.length > 0) currentStore.adsGroups = adsGroups;

    currentStore.isCleared = false;
    currentStore.hasInitialized = true;
    currentStore.lastUpdated = new Date().toISOString();
    saveStoredData(currentStore);

    res.json({
      success: true,
      message: 'ซิงค์และบันทึกข้อมูลเรียบร้อยแล้ว',
      lastUpdated: currentStore.lastUpdated,
      counts: {
        main: currentStore.mainRows.length,
        status: currentStore.statusRows.length,
        sales: currentStore.salesRows.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/ads-groups', '/ads-groups'], (req, res) => {
  try {
    const { adsGroups } = req.body;
    if (Array.isArray(adsGroups)) {
      currentStore.adsGroups = adsGroups;
      currentStore.lastUpdated = new Date().toISOString();
      saveStoredData(currentStore);
    }
    res.json({ success: true, adsGroups: currentStore.adsGroups });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/update-lead', '/update-lead'], (req, res) => {
  try {
    const { leadNo, customerName } = req.body;
    if (leadNo && customerName) {
      currentStore.statusRows = currentStore.statusRows.map((r: any) => {
        if (r.leadNo === leadNo) {
          return { ...r, customerName };
        }
        return r;
      });
      currentStore.lastUpdated = new Date().toISOString();
      saveStoredData(currentStore);
    }
    res.json({ success: true, message: 'อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/clear', '/clear'], (req, res) => {
  try {
    currentStore = {
      mainRows: [],
      statusRows: [],
      salesRows: [],
      adsGroups: currentStore.adsGroups || [],
      lastUpdated: new Date().toISOString(),
      isCleared: true,
      hasInitialized: true,
    };
    saveStoredData(currentStore);
    res.json({ success: true, message: 'ล้างข้อมูลไฟล์ทั้งหมดเรียบร้อยแล้ว' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware & SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen when running standalone dev/container, not on Vercel Serverless
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

// Start standalone server unless running in Vercel Serverless
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
