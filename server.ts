import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import cron from "node-cron";
import * as admin from "firebase-admin";
import bcrypt from "bcrypt";

dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
      projectId: "gen-lang-client-0587506116",
  });
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DB_FILE = path.join(process.cwd(), "employees-db.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings-db.json");
const SMS_LOGS_FILE = path.join(process.cwd(), "sms-logs-db.json");

// Middleware to verify Firebase Auth token
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


async function getSmsLogsFile() {
  try {
    const data = await fs.readFile(SMS_LOGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    await fs.writeFile(SMS_LOGS_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

async function addSmsLog(logEntry: any) {
  const logs = await getSmsLogsFile();
  const newLog = { ...logEntry, id: Date.now().toString(), sentAt: new Date().toISOString() };
  logs.unshift(newLog); // Add to beginning
  await fs.writeFile(SMS_LOGS_FILE, JSON.stringify(logs, null, 2));
  return newLog;
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
};

async function getSettingsFile() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
}

async function getEmployeesFile() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    const defaultData = [
      {
        id: "1",
        avatar: "https://i.pravatar.cc/150?u=12",
        pin: "32201",
        name: "John Doe",
        email: "john.doe@rsr.com",
        department: "Engineering",
        position: "Project Engineer",
        status: "Active",
        lastLogin: "May 20, 2024\\n08:34 AM",
      },
      {
        id: "2",
        avatar: "https://i.pravatar.cc/150?u=13",
        pin: "34319",
        name: "Jane Smith",
        email: "jane.smith@rsr.com",
        department: "HR Department",
        position: "HR Manager",
        status: "Active",
        lastLogin: "May 20, 2024\\n08:48 AM",
      },
    ];
    await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/login-employee", async (req, res) => {
    try {
      const { loginId, pin } = req.body;
      const db = admin.firestore();
      const empsSnap = await db.collection("employees").get();
      let foundEmp = null;

      for (const doc of empsSnap.docs) {
          const data = doc.data();
          const empIdMatches = data.id?.toLowerCase() === loginId || doc.id.toLowerCase() === loginId;
          const emailMatches = data.email?.toLowerCase() === loginId;
          
          if (empIdMatches || emailMatches) {
              // Now check PIN
              let pinMatches = false;
              if (data.pin === pin) {
                  pinMatches = true; // Plaintext fallback
              } else if (data.pin?.startsWith("$2b$") || data.pin?.startsWith("$2a$")) {
                  pinMatches = await bcrypt.compare(pin, data.pin);
              } else {
                  // Legacy SHA-256 fallback
                  const msgUint8 = new TextEncoder().encode(pin);
                  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                  const hashArray = Array.from(new Uint8Array(hashBuffer));
                  const hashedPin = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
                  if (data.pin === hashedPin) {
                      pinMatches = true;
                  }
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
      
      const token = await admin.auth().createCustomToken(foundEmp.id, { role: "employee" });
      res.json({ success: true, token, employee: foundEmp });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Employees REST API
  app.get("/api/employees", verifyAuth, async (req, res) => {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("employees").get();
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, employees });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/employees", verifyAuth, async (req, res) => {
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

  app.put("/api/employees/:id", verifyAuth, async (req, res) => {
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

  app.delete("/api/employees/:id", verifyAuth, async (req, res) => {
    try {
      const db = admin.firestore();
      await db.collection("employees").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Settings API
  app.get("/api/settings", verifyAuth, async (req, res) => {
    try {
      const settings = await getSettingsFile();
      res.json({ success: true, settings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/settings", verifyAuth, async (req, res) => {
    try {
      const existingSettings = await getSettingsFile();
      const updatedSettings = { ...existingSettings, ...req.body };
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
      res.json({ success: true, settings: updatedSettings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API Route for Semaphore SMS
  app.get("/api/sms-logs", verifyAuth, async (req, res) => {
    try {
      const logs = await getSmsLogsFile();
      res.json({ success: true, logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/send-sms", verifyAuth, async (req, res) => {
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
  app.post("/api/extract-leave", verifyAuth, async (req, res) => {
    try {
      const { text } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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

  app.post("/api/sync/employees", verifyAuth, async (req, res) => {
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

  app.post("/api/sync/punches", verifyAuth, async (req, res) => {
    const punches = Array.isArray(req.body?.punches) ? req.body.punches : [];
    res.json({
      success: true,
      synced: punches.length,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
