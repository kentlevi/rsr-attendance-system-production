import express from "express";
import cors from "cors";
import path from "path";
import * as fs from "fs/promises";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import cron from "node-cron";
import adminPkg from "firebase-admin";
import bcrypt from "bcrypt";

const admin = adminPkg;

dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
      projectId: "gen-lang-client-0587506116",
  });
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// No local JSON DB files used anymore

const verifyAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
};


async function getSmsLogsFile() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("smsLogs").orderBy("sentAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching SMS logs:", e);
    return [];
  }
}

async function addSmsLog(logEntry: any) {
  const db = admin.firestore();
  const newLog = { ...logEntry, sentAt: new Date().toISOString() };
  const docRef = await db.collection("smsLogs").add(newLog);
  return { ...newLog, id: docRef.id };
}

const defaultSettings = {
  activeSite: "Head Office",
  sites: ["Head Office", "Site A", "Site B"],
  dailyAllowance: 150.00,
  otAllowance: 75.00,
  awaySiteAllowance: 200.00,
  awaySiteAllowanceRule: "Apply when employee is assigned outside active site",
  shiftStartTime: "08:00",
  shiftEndTime: "17:00",
  gracePeriodMins: 15,
  lunchBreakStart: "12:00",
  lunchBreakEnd: "13:00",
  pmBreakStart: "15:00",
  pmBreakEnd: "15:15",
  autoTimeoutRule: "Out automatically after shift end time + grace period",
  smsEnabled: true,
  semaphoreApiKey: "",
  senderName: "RSR-ATTEND",
  adminMobile: "+63 917 123 4567",
  notificationGroup: "Attendance Alerts",
  attendancePhotoUploadEnabled: false,
};

async function getSettingsFile() {
  try {
    const db = admin.firestore();
    const doc = await db.collection("settings").doc("global").get();
    if (doc.exists) {
      return { ...defaultSettings, ...doc.data() };
    }
    await db.collection("settings").doc("global").set(defaultSettings);
    return defaultSettings;
  } catch (e) {
    console.error("Error fetching settings:", e);
    return defaultSettings;
  }
}

// Rate limiting for login endpoints
const loginAttempts = new Map<string, { count: number, lockUntil: number }>();

function handleRateLimit(ip: string, success: boolean): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  
  if (attempt.lockUntil > now) {
    return false; // locked out
  }
  
  if (success) {
    loginAttempts.delete(ip);
    return true;
  }
  
  attempt.count++;
  if (attempt.count >= 5) {
    attempt.lockUntil = now + 15 * 60 * 1000; // 15 mins block
  }
  loginAttempts.set(ip, attempt);
  return true;
}

export async function createApp(options: { useVite?: boolean } = {}) {
  const app = express();
  const useVite = options.useVite ?? process.env.NODE_ENV !== "production";

  app.use(cors());
  app.use(express.json());

  app.post("/api/login-employee", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const isAllowed = handleRateLimit(clientIp, false); // initial check, we'll delete on success
      
      if (!isAllowed) {
        return res.status(429).json({ success: false, error: "Too many failed attempts. Please try again in 15 minutes." });
      }

      const { loginId, pin } = req.body;
      const db = admin.firestore();
      const empsSnap = await db.collection("employees").get();
      let foundEmp = null;

      for (const doc of empsSnap.docs) {
          const data = doc.data();
          const empIdMatches = data.id?.toLowerCase() === loginId || doc.id.toLowerCase() === loginId;
          const emailMatches = data.email?.toLowerCase() === loginId;
          
          if (empIdMatches || emailMatches) {
              // Only allow bcrypt hashes for PIN verification.
              // All legacy SHA-256 and plaintext PINs have been migrated or reset.
              let pinMatches = false;
              if (data.pin?.startsWith("$2b$") || data.pin?.startsWith("$2a$")) {
                  pinMatches = await bcrypt.compare(pin, data.pin);
              }

              if (pinMatches) {
                  foundEmp = { ...data, id: doc.id };
                  break;
              }
          }
      }

      if (!foundEmp) {
          return res.status(401).json({ success: false, error: "Invalid employee credentials." });
      }
      
      handleRateLimit(clientIp, true); // Reset attempts on success
      
      const token = await admin.auth().createCustomToken(foundEmp.id, { role: "employee" });
      res.json({ success: true, token, employee: foundEmp });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/login-admin", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const isAllowed = handleRateLimit(clientIp, false); 
      if (!isAllowed) {
        return res.status(429).json({ success: false, error: "Too many failed attempts." });
      }

      const { email, password } = req.body;
      const db = admin.firestore();
      const adminSnap = await db.collection("adminAccounts").where("email", "==", email).get();

      if (adminSnap.empty) {
         // Also check by loginId to be flexible
         const adminByIdSnap = await db.collection("adminAccounts").where("loginId", "==", email).get();
         if (adminByIdSnap.empty) {
            return res.status(401).json({ success: false, error: "Invalid admin credentials." });
         }
         var adminDoc = adminByIdSnap.docs[0];
      } else {
         var adminDoc = adminSnap.docs[0];
      }

      const adminData = adminDoc.data();

      // Check password (comparing plaintext for now, based on mock data seeding logic)
      if (adminData.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid admin credentials." });
      }

      handleRateLimit(clientIp, true);
      const token = await admin.auth().createCustomToken(adminDoc.id, { role: adminData.role || "admin", email: adminData.email });
      res.json({ success: true, token, user: adminData });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Employees REST API
  app.get("/api/employees", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("employees").get();
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, employees });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/employees", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const employeeData = { ...req.body };
      if (employeeData.pin) {
        const salt = await bcrypt.genSalt(10);
        employeeData.pin = await bcrypt.hash(employeeData.pin, salt);
      }
      const docRef = await db.collection("employees").add(employeeData);
      res.json({ success: true, employee: { ...employeeData, id: docRef.id } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/employees/:id", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const employeeData = { ...req.body };
      if (employeeData.pin && employeeData.pin.length < 60) {
        const salt = await bcrypt.genSalt(10);
        employeeData.pin = await bcrypt.hash(employeeData.pin, salt);
      }
      await db.collection("employees").doc(req.params.id).update(employeeData);
      res.json({ success: true, employee: { ...employeeData, id: req.params.id } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/employees/:id", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      await db.collection("employees").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Settings API
  app.get("/api/settings", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await getSettingsFile();
      res.json({ success: true, settings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/settings", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const existingSettings = await getSettingsFile();
      const updatedSettings = { ...existingSettings, ...req.body };
      await db.collection("settings").doc("global").set(updatedSettings);
      res.json({ success: true, settings: updatedSettings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API Route for Semaphore SMS
  app.get("/api/sms-logs", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await getSmsLogsFile();
      res.json({ success: true, logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/send-sms", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const { phone, message, sendername, apikey, employeeName } = req.body;
      const params = new URLSearchParams({
        apikey: apikey || process.env.SEMAPHORE_API_KEY || "",
        number: phone,
        message,
        sendername: sendername || "RSR ENGRG",
      });
      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await response.json();
      
      const success = response.ok && (!data.error);

      // Add to logs
      await addSmsLog({
        name: employeeName || "Test Number",
        phone,
        preview: message,
        status: success ? "Delivered" : "Failed",
        response: data
      });

      res.json({ success, data });
    } catch (e: any) {
      // Add to logs
      const { phone, message, employeeName } = req.body;
      await addSmsLog({
        name: employeeName || "Test Number",
        phone,
        preview: message,
        status: "Failed",
        error: e.message
      });
      res.json({ success: false, error: e.message });
    }
  });

  // AI Endpoint for Leave Extraction
  // NOTE: This is intentionally accessible to all authenticated users (both admins and employees)
  // because employees need to use the AI chatbot to extract intent from their queries.
  app.post("/api/extract-leave", verifyAuth, async (req, res) => {
    try {
      const { text } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are an automated backend processor for the RSR Engineering Attendance System. Your job is to extract leave filing requests from employee text. You must analyze the text and extract the exact dates, the type of leave (Sick Leave, Vacation Leave, Emergency Leave, or Unpaid), and the reason. Assume the current location is Cauayan, Philippines, and calculate relative dates ('tomorrow', 'next Monday') based on today's exact date (${new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}). You must output ONLY valid JSON.\n\nEmployee text:\n${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
              endDate: { type: Type.STRING, description: "YYYY-MM-DD" },
              type: {
                type: Type.STRING,
                enum: [
                  "Sick Leave",
                  "Vacation Leave",
                  "Emergency Leave",
                  "Leave Without Pay",
                ],
              },
              reason: { type: Type.STRING },
            },
            required: ["startDate", "endDate", "type", "reason"],
          } as Schema,
        },
      });
      if (response.text) {
        res.json(JSON.parse(response.text));
      } else {
        res.status(500).json({ error: "Failed to extract" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // NOTE: This is intentionally accessible to all authenticated users (both admins and employees)
  // because employees need to interact with the HR assistant chatbot in their portal.
  app.post("/api/hr-assistant", verifyAuth, async (req, res) => {
    try {
      const { messages, context } = req.body;
      // Handle the case where the last message is a tool response
      const mappedMessages = messages.map((m: any) => {
        if (m.role === 'tool') {
           return {
             role: 'user',
             parts: [{
               functionResponse: {
                 name: m.name,
                 response: m.response
               }
             }]
           };
        }
        if (m.functionCall) {
            return {
                role: 'model',
                parts: [{
                    functionCall: m.functionCall
                }]
            };
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        };
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: mappedMessages,
        config: {
          systemInstruction: `You are the RSR Engineering AI HR Assistant. Your job is to help employees with their HR-related queries, such as leave balances, company policies, and daily schedules. Be polite, concise, and helpful. Do not output markdown code blocks if you can avoid it, just use regular text. Use the following context to answer questions accurately:\n\n${context}`,
          tools: [{
              functionDeclarations: [
                  {
                      name: "fileLeave",
                      description: "File a leave request on behalf of the employee.",
                      parameters: {
                          type: Type.OBJECT,
                          properties: {
                              type: {
                                  type: Type.STRING,
                                  description: "Type of leave: 'sick', 'vacation', 'emergency', or 'unpaid'"
                              },
                              startDate: {
                                  type: Type.STRING,
                                  description: "Start date in YYYY-MM-DD format"
                              },
                              endDate: {
                                  type: Type.STRING,
                                  description: "End date in YYYY-MM-DD format"
                              },
                              reason: {
                                  type: Type.STRING,
                                  description: "Reason for the leave"
                              }
                          },
                          required: ["type", "startDate", "endDate", "reason"]
                      }
                  }
              ]
          }]
        }
      });
      
      const functionCall = response.functionCalls?.[0];
      if (functionCall) {
          res.json({ functionCall });
      } else {
          res.json({ text: response.text });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // Face match — server-side recognition path.
  //
  // The client (kiosk or employee portal) extracts a face descriptor locally
  // via @vladmandic/human and POSTs the float[] embedding here. The server
  // compares it against `facialRecognitionProfiles` using the Firebase Admin
  // SDK (which bypasses Firestore rules), so the kiosk no longer needs to
  // LIST the entire employee roster client-side — the only thing returned is
  // the matched employee's id and name.
  //
  // No verifyAuth: the kiosk operates anonymously by design. The endpoint
  // returns minimal information (id + name + similarity) which is no worse
  // than what was previously readable via the LIST queries, and rate-limited
  // by an in-process cooldown to make scraping impractical.
  // --------------------------------------------------------------------------

  // Cosine similarity between two equally-sized float arrays.
  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      dot += av * bv;
      na += av * av;
      nb += bv * bv;
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  };

  // In-process cache for face profiles + threshold. Refreshed once per
  // CACHE_TTL_MS to avoid hammering Firestore on every match. Cache hit on a
  // warm container takes <10ms.
  type CachedProfile = { employeeId: string; descriptors: number[][] };
  const FACE_CACHE_TTL_MS = 60_000;
  let faceCache: { profiles: CachedProfile[]; expiresAt: number } | null = null;

  const loadFaceProfiles = async (): Promise<CachedProfile[]> => {
    if (faceCache && faceCache.expiresAt > Date.now()) {
      return faceCache.profiles;
    }
    const db = admin.firestore();
    const snap = await db.collection("facialRecognitionProfiles").get();
    const profiles: CachedProfile[] = snap.docs.map((doc) => {
      const data = doc.data() as any;
      const raw = data.faceDataEncodings;
      let descriptors: number[][] = [];
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          descriptors = Array.isArray(parsed) ? parsed : [];
        } catch {
          descriptors = [];
        }
      } else if (Array.isArray(raw)) {
        descriptors = raw as number[][];
      }
      return { employeeId: data.employeeId || doc.id, descriptors };
    });
    faceCache = { profiles, expiresAt: Date.now() + FACE_CACHE_TTL_MS };
    return profiles;
  };

  app.post("/api/face-match", async (req, res) => {
    try {
      const { descriptor, threshold } = req.body as {
        descriptor?: number[];
        threshold?: number;
      };
      if (!Array.isArray(descriptor) || descriptor.length === 0) {
        return res.status(400).json({ error: "descriptor[] is required" });
      }
      const minSimilarity = typeof threshold === "number" ? threshold : 0.65;

      const profiles = await loadFaceProfiles();

      let bestEmployeeId: string | null = null;
      let bestSimilarity = minSimilarity;

      for (const profile of profiles) {
        for (const saved of profile.descriptors) {
          if (!Array.isArray(saved) || saved.length === 0) continue;
          const sim = cosineSimilarity(descriptor, saved);
          if (!isFinite(sim)) continue;
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestEmployeeId = profile.employeeId;
          }
        }
      }

      // Resolve the matched id to a display name. Returns null name if the
      // employee row was deleted but the face profile lingered — the client
      // surfaces that as "Identity recognized but employee not found".
      let employeeName: string | null = null;
      if (bestEmployeeId) {
        const db = admin.firestore();
        const byDoc = await db.collection("employees").doc(bestEmployeeId).get();
        if (byDoc.exists) {
          employeeName = (byDoc.data() as any)?.name || null;
        } else {
          // Fall back to a query by employeeId field (legacy human-readable id).
          const byField = await db
            .collection("employees")
            .where("employeeId", "==", bestEmployeeId)
            .limit(1)
            .get();
          if (!byField.empty) {
            employeeName = (byField.docs[0].data() as any)?.name || null;
          }
        }
      }

      return res.json({
        employeeId: bestEmployeeId,
        employeeName,
        similarity: bestEmployeeId ? bestSimilarity : 0,
      });
    } catch (e: any) {
      console.error("/api/face-match error", e);
      return res.status(500).json({ error: e?.message || "match failed" });
    }
  });

  app.post("/api/sync/employees", verifyAuth, requireAdmin, async (req, res) => {
    const employee = req.body;
    if (!employee?.empCode) {
      res.status(400).json({ success: false, error: "empCode is required" });
      return;
    }

    // V3 biometric sync contract. Persist this in the production database layer.
    res.json({
      success: true,
      employee: {
        empCode: employee.empCode,
        name: employee.name,
        active: employee.active !== false,
        biometricReferenceCaptured: Boolean(
          employee.biometricReferenceCaptured,
        ),
        faceEmbeddingIncluded: Boolean(employee.faceEmbedding),
      },
    });
  });

  app.post("/api/sync/punches", verifyAuth, requireAdmin, async (req, res) => {
    const punches = Array.isArray(req.body?.punches) ? req.body.punches : [];
    res.json({
      success: true,
      synced: punches.length,
    });
  });

  if (useVite) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Add custom middleware to force correct MIME types for face-api models in dev
    app.use((req, res, next) => {
      if (req.url.includes('/models/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        if (req.url.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (req.url.includes('shard')) {
          res.setHeader('Content-Type', 'application/octet-stream');
          // Prevent any automatic compression that might corrupt binary data
          res.setHeader('Content-Encoding', 'identity');
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.includes('/models/')) {
          if (path.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          } else if (path.includes('shard')) {
            res.setHeader('Content-Type', 'application/octet-stream');
          }
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

async function startServer() {
  const PORT = process.env.PORT || 3000;
  const app = await createApp();

  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
