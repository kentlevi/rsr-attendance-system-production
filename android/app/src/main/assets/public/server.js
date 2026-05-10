import express from "express";
import { createServer } from "vite";
import path from "path";
import * as fs from "fs/promises";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import adminPkg from "firebase-admin";
import bcrypt from "bcrypt";
const admin = adminPkg.default || adminPkg;
dotenv.config({ path: ".env.local" });
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "gen-lang-client-0587506116"
  });
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
path.join(process.cwd(), "employees-db.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings-db.json");
const SMS_LOGS_FILE = path.join(process.cwd(), "sms-logs-db.json");
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!(authHeader == null ? void 0 : authHeader.startsWith("Bearer "))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
const requireAdmin = async (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
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
async function addSmsLog(logEntry) {
  const logs = await getSmsLogsFile();
  const newLog = { ...logEntry, id: Date.now().toString(), sentAt: (/* @__PURE__ */ new Date()).toISOString() };
  logs.unshift(newLog);
  await fs.writeFile(SMS_LOGS_FILE, JSON.stringify(logs, null, 2));
  return newLog;
}
const defaultSettings = {
  activeSite: "Head Office",
  sites: ["Head Office", "Site A", "Site B"],
  dailyAllowance: 150,
  otAllowance: 75,
  awaySiteAllowance: 200,
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
  attendancePhotoUploadEnabled: false
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
const loginAttempts = /* @__PURE__ */ new Map();
function handleRateLimit(ip, success) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  if (attempt.lockUntil > now) {
    return false;
  }
  if (success) {
    loginAttempts.delete(ip);
    return true;
  }
  attempt.count++;
  if (attempt.count >= 5) {
    attempt.lockUntil = now + 15 * 60 * 1e3;
  }
  loginAttempts.set(ip, attempt);
  return true;
}
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json());
  app.post("/api/login-employee", async (req, res) => {
    var _a, _b, _c, _d;
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const isAllowed = handleRateLimit(clientIp, false);
      if (!isAllowed) {
        return res.status(429).json({ success: false, error: "Too many failed attempts. Please try again in 15 minutes." });
      }
      const { loginId, pin } = req.body;
      const db = admin.firestore();
      const empsSnap = await db.collection("employees").get();
      let foundEmp = null;
      for (const doc of empsSnap.docs) {
        const data = doc.data();
        const empIdMatches = ((_a = data.id) == null ? void 0 : _a.toLowerCase()) === loginId || doc.id.toLowerCase() === loginId;
        const emailMatches = ((_b = data.email) == null ? void 0 : _b.toLowerCase()) === loginId;
        if (empIdMatches || emailMatches) {
          let pinMatches = false;
          if (((_c = data.pin) == null ? void 0 : _c.startsWith("$2b$")) || ((_d = data.pin) == null ? void 0 : _d.startsWith("$2a$"))) {
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
      handleRateLimit(clientIp, true);
      const token = await admin.auth().createCustomToken(foundEmp.id, { role: "employee" });
      res.json({ success: true, token, employee: foundEmp });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/login-admin", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const isAllowed = handleRateLimit(clientIp, false);
      if (!isAllowed) {
        return res.status(429).json({ success: false, error: "Too many failed attempts." });
      }
      const { email, password } = req.body;
      const db = admin.firestore();
      const adminSnap = await db.collection("adminAccounts").where("email", "==", email).get();
      if (adminSnap.empty) {
        const adminByIdSnap = await db.collection("adminAccounts").where("loginId", "==", email).get();
        if (adminByIdSnap.empty) {
          return res.status(401).json({ success: false, error: "Invalid admin credentials." });
        }
        var adminDoc = adminByIdSnap.docs[0];
      } else {
        var adminDoc = adminSnap.docs[0];
      }
      const adminData = adminDoc.data();
      if (adminData.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid admin credentials." });
      }
      handleRateLimit(clientIp, true);
      const token = await admin.auth().createCustomToken(adminDoc.id, { role: adminData.role || "admin", email: adminData.email });
      res.json({ success: true, token, user: adminData });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/employees", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("employees").get();
      const employees = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, employees });
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.delete("/api/employees/:id", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      await db.collection("employees").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/settings", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await getSettingsFile();
      res.json({ success: true, settings });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.put("/api/settings", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const existingSettings = await getSettingsFile();
      const updatedSettings = { ...existingSettings, ...req.body };
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
      res.json({ success: true, settings: updatedSettings });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/sms-logs", verifyAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await getSmsLogsFile();
      res.json({ success: true, logs });
    } catch (e) {
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
        sendername: sendername || "RSR ENGRG"
      });
      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      });
      const data = await response.json();
      const success = response.ok && !data.error;
      await addSmsLog({
        name: employeeName || "Test Number",
        phone,
        preview: message,
        status: success ? "Delivered" : "Failed",
        response: data
      });
      res.json({ success, data });
    } catch (e) {
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
  app.post("/api/extract-leave", verifyAuth, async (req, res) => {
    try {
      const { text } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are an automated backend processor for the RSR Engineering Attendance System. Your job is to extract leave filing requests from employee text. You must analyze the text and extract the exact dates, the type of leave (Sick Leave, Vacation Leave, Emergency Leave, or Unpaid), and the reason. Assume the current location is Cauayan, Philippines, and calculate relative dates ('tomorrow', 'next Monday') based on today's exact date (${(/* @__PURE__ */ new Date()).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}). You must output ONLY valid JSON.

Employee text:
${text}`,
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
                  "Leave Without Pay"
                ]
              },
              reason: { type: Type.STRING }
            },
            required: ["startDate", "endDate", "type", "reason"]
          }
        }
      });
      if (response.text) {
        res.json(JSON.parse(response.text));
      } else {
        res.status(500).json({ error: "Failed to extract" });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/hr-assistant", verifyAuth, async (req, res) => {
    var _a;
    try {
      const { messages, context } = req.body;
      const mappedMessages = messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "user",
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
            role: "model",
            parts: [{
              functionCall: m.functionCall
            }]
          };
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        };
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: mappedMessages,
        config: {
          systemInstruction: `You are the RSR Engineering AI HR Assistant. Your job is to help employees with their HR-related queries, such as leave balances, company policies, and daily schedules. Be polite, concise, and helpful. Do not output markdown code blocks if you can avoid it, just use regular text. Use the following context to answer questions accurately:

${context}`,
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
      const functionCall = (_a = response.functionCalls) == null ? void 0 : _a[0];
      if (functionCall) {
        res.json({ functionCall });
      } else {
        res.json({ text: response.text });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/sync/employees", verifyAuth, requireAdmin, async (req, res) => {
    const employee = req.body;
    if (!(employee == null ? void 0 : employee.empCode)) {
      res.status(400).json({ success: false, error: "empCode is required" });
      return;
    }
    res.json({
      success: true,
      employee: {
        empCode: employee.empCode,
        name: employee.name,
        active: employee.active !== false,
        biometricReferenceCaptured: Boolean(
          employee.biometricReferenceCaptured
        ),
        faceEmbeddingIncluded: Boolean(employee.faceEmbedding)
      }
    });
  });
  app.post("/api/sync/punches", verifyAuth, requireAdmin, async (req, res) => {
    var _a;
    const punches = Array.isArray((_a = req.body) == null ? void 0 : _a.punches) ? req.body.punches : [];
    res.json({
      success: true,
      synced: punches.length
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
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
