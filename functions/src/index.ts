import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. Leave Replenishment
// Runs on the 1st of every month at midnight
export const monthlyLeaveReplenishment = functions.pubsub.schedule('0 0 1 * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    const batch = db.batch();
    const employeesRef = db.collection("employees");
    const activeEmployees = await employeesRef.where("status", "==", "Active").get();

    activeEmployees.forEach(doc => {
      batch.update(doc.ref, {
        vlBalance: admin.firestore.FieldValue.increment(1.25),
        slBalance: admin.firestore.FieldValue.increment(1.25),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    console.log(`Replenished leaves for ${activeEmployees.size} employees.`);
});

// 2. Daily AWOL Detection
// Runs every night at 11:59PM
export const dailyAwolDetection = functions.pubsub.schedule('59 23 * * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    // Generate ISO date YYYY-MM-DD without time zone shift issues in Manila timezone
    const nowManila = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    const today = nowManila.toLocaleDateString("en-CA"); // YYYY-MM-DD

    const batch = db.batch();
    
    // Get active employees
    const employeesSnap = await db.collection("employees").where("status", "==", "Active").get();
    
    // Get today's attendance logs
    const attendanceSnap = await db.collection("attendance").where("date", "==", today).get();
    const presentIds = attendanceSnap.docs.map(doc => doc.data().employeeId);

    // Get today's leaves
    const leavesSnap = await db.collection("leaves").where("status", "==", "Approved").get();
    const onLeaveIds = leavesSnap.docs
      .filter(doc => new Date(today) >= new Date(doc.data().startDate) && new Date(today) <= new Date(doc.data().endDate))
      .map(doc => doc.data().employeeId);

    let awolCount = 0;
    employeesSnap.forEach(doc => {
      const empId = doc.data().id;
      if (!presentIds.includes(empId) && !onLeaveIds.includes(empId)) {
        // Log AWOL
        const logRef = db.collection("attendance").doc();
        batch.set(logRef, {
          id: logRef.id,
          employeeId: empId,
          date: today,
          status: "Absent",
          timeIn: "-",
          timeOut: "-",
          payrollNotes: ["AWOL / Unnotified Absence"]
        });
        awolCount++;
      }
    });

    await batch.commit();
    console.log(`Detected and logged AWOL for ${awolCount} employees.`);
});

// 3. Bi-Monthly Allowance Distribution
// Runs on the 15th and last day of the month at midnight
export const bimonthlyAllowanceDistribution = functions.pubsub.schedule('0 0 15,L * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    const today = new Date().toISOString().split('T')[0];
    const batch = db.batch();

    // Fetch active settings and active employees
    const settingsDoc = await db.collection("settings").doc("config").get();
    const awaySiteAllowance = settingsDoc.data()?.awaySiteAllowance || 0;

    const employeesSnap = await db.collection("employees")
      .where("status", "==", "Active")
      .get();

    let allowanceCount = 0;
    employeesSnap.forEach(doc => {
      const emp = doc.data();
      // Give standard 15th/30th basic allowance config to field engineers
      if (emp.allowanceType === 'Daily Field Allowance') {
        const allowanceRef = db.collection("allowances").doc();
        batch.set(allowanceRef, {
          id: allowanceRef.id,
          employeeId: emp.id,
          date: today,
          baseAllowance: awaySiteAllowance * 15, // Approx 15 days worth 
          otBonus: '0',
          override: '0',
          finalAmount: (awaySiteAllowance * 15).toString(),
          isOverride: false
        });
        allowanceCount++;
      }
    });

    await batch.commit();
    console.log(`Distributed bulk allowance to ${allowanceCount} employees.`);
});
