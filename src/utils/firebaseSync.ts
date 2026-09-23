import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { RawMainRow, RawStatusRow, RawSalesRow, AdsGroup } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Optional auth attempt - does not block Firestore operations
export async function ensureAuth() {
  return true;
}

// Test connection on boot as specified in Firestore skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'app_state', 'connection_test')).catch(() => {});
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
  }
}
testConnection();

export interface CloudPayload {
  mainRows: RawMainRow[];
  statusRows: RawStatusRow[];
  salesRows: RawSalesRow[];
  adsGroups: AdsGroup[];
  lastUpdated: string;
}

// Chunking helper: Firestore document limit is 1MB.
// Status rows (e.g. 1,600 rows) are ~500KB total. We chunk by 300 rows per doc.
const CHUNK_SIZE = 300;

/**
 * Save complete datasets to Firestore so ALL online users, browsers, and devices share identical state.
 */
export async function saveDataToCloud(data: CloudPayload): Promise<boolean> {
  try {
    // 1. Save Ads Groups into /app_state/ads_groups
    if (data.adsGroups && data.adsGroups.length > 0) {
      await setDoc(doc(db, 'app_state', 'ads_groups'), {
        groups: data.adsGroups,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Save statusRows chunks
    const statusChunks = Math.ceil((data.statusRows?.length || 0) / CHUNK_SIZE);
    for (let c = 0; c < statusChunks; c++) {
      const slice = data.statusRows.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      await setDoc(doc(db, 'data_chunks', `status_chunk_${c}`), {
        chunkIndex: c,
        type: 'status',
        rows: slice,
      });
    }

    // 3. Save mainRows chunks
    const mainChunks = Math.ceil((data.mainRows?.length || 0) / CHUNK_SIZE);
    for (let c = 0; c < mainChunks; c++) {
      const slice = data.mainRows.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      await setDoc(doc(db, 'data_chunks', `main_chunk_${c}`), {
        chunkIndex: c,
        type: 'main',
        rows: slice,
      });
    }

    // 4. Save salesRows chunks
    const salesChunks = Math.ceil((data.salesRows?.length || 0) / CHUNK_SIZE);
    for (let c = 0; c < salesChunks; c++) {
      const slice = data.salesRows.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      await setDoc(doc(db, 'data_chunks', `sales_chunk_${c}`), {
        chunkIndex: c,
        type: 'sales',
        rows: slice,
      });
    }

    // 5. Save global App State
    await setDoc(doc(db, 'app_state', 'global'), {
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      mainCount: data.mainRows?.length || 0,
      statusCount: data.statusRows?.length || 0,
      salesCount: data.salesRows?.length || 0,
      statusChunks,
      mainChunks,
      salesChunks,
    });

    return true;
  } catch (err) {
    console.error('Save to Cloud Firestore error:', err);
    return false;
  }
}

/**
 * Save ads groups to Firestore so all users see custom ads groups.
 */
export async function saveAdsGroupsToCloud(adsGroups: AdsGroup[]): Promise<boolean> {
  try {
    await setDoc(doc(db, 'app_state', 'ads_groups'), {
      groups: adsGroups,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(
      doc(db, 'app_state', 'global'),
      {
        adsGroupsUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Save ads groups to cloud note:', err);
    return false;
  }
}

/**
 * Update a single lead's customer name in Firestore and sync.
 */
export async function updateLeadCustomerNameInCloud(
  leadNo: string,
  newCustomerName: string,
  currentStatusRows: RawStatusRow[]
): Promise<boolean> {
  try {
    const updatedStatusRows = currentStatusRows.map((r) => {
      if (r.leadNo === leadNo) {
        return { ...r, customerName: newCustomerName };
      }
      return r;
    });

    // Find which chunk contains this lead
    const chunkIndex = Math.floor(
      updatedStatusRows.findIndex((r) => r.leadNo === leadNo) / CHUNK_SIZE
    );

    if (chunkIndex >= 0) {
      const slice = updatedStatusRows.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
      await setDoc(doc(db, 'data_chunks', `status_chunk_${chunkIndex}`), {
        chunkIndex,
        type: 'status',
        rows: slice,
      });
      await setDoc(
        doc(db, 'app_state', 'global'),
        {
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return true;
  } catch (err) {
    console.warn('Update lead customer name error:', err);
    return false;
  }
}

/**
 * Load complete dataset from Firestore.
 */
export async function loadDataFromCloud(): Promise<CloudPayload | null> {
  try {
    const appStateSnap = await getDoc(doc(db, 'app_state', 'global'));
    if (!appStateSnap.exists()) {
      return null;
    }
    const appState = appStateSnap.data();

    // Load Ads Groups from doc(db, 'app_state', 'ads_groups')
    const adsSnap = await getDoc(doc(db, 'app_state', 'ads_groups'));
    const adsGroups: AdsGroup[] =
      adsSnap.exists() && Array.isArray(adsSnap.data()?.groups)
        ? adsSnap.data().groups
        : [];

    // Load Chunks
    const statusChunksCount = appState.statusChunks || 0;
    const mainChunksCount = appState.mainChunks || 0;
    const salesChunksCount = appState.salesChunks || 0;

    let statusRows: RawStatusRow[] = [];
    for (let c = 0; c < statusChunksCount; c++) {
      const snap = await getDoc(doc(db, 'data_chunks', `status_chunk_${c}`));
      if (snap.exists()) {
        const rows = snap.data()?.rows || [];
        statusRows = statusRows.concat(rows);
      }
    }

    let mainRows: RawMainRow[] = [];
    for (let c = 0; c < mainChunksCount; c++) {
      const snap = await getDoc(doc(db, 'data_chunks', `main_chunk_${c}`));
      if (snap.exists()) {
        const rows = snap.data()?.rows || [];
        mainRows = mainRows.concat(rows);
      }
    }

    let salesRows: RawSalesRow[] = [];
    for (let c = 0; c < salesChunksCount; c++) {
      const snap = await getDoc(doc(db, 'data_chunks', `sales_chunk_${c}`));
      if (snap.exists()) {
        const rows = snap.data()?.rows || [];
        salesRows = salesRows.concat(rows);
      }
    }

    return {
      mainRows,
      statusRows,
      salesRows,
      adsGroups,
      lastUpdated: appState.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Load from Cloud Firestore note:', err);
    return null;
  }
}

/**
 * Real-time listener: triggers whenever any team member uploads new data,
 * creates an Ads group, or updates customer details.
 */
export function subscribeToCloudUpdates(onUpdate: () => void): () => void {
  try {
    const unsubAppState = onSnapshot(
      doc(db, 'app_state', 'global'),
      () => {
        onUpdate();
      },
      (err) => {
        console.warn('Firestore subscription note:', err.message);
      }
    );
    return unsubAppState;
  } catch {
    return () => {};
  }
}
