import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const employeesRef = collection(db, "employees");
  const qs = await getDocs(employeesRef);
  
  let docsInserted = 0;

  for (const docSnap of qs.docs) {
    const employeeId = docSnap.id;
    // Add some leaves
    const leaves = [
      {
        employeeId,
        startDate: "2026-05-15",
        endDate: "2026-05-18",
        type: "Vacation Leave",
        status: "Pending",
        reason: "Family trip",
      },
      {
        employeeId,
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        type: "Sick Leave",
        status: "Approved",
        reason: "Fever and cold",
        reviewedBy: "hr_manager",
        reviewedAt: new Date().toISOString()
      },
      {
        employeeId,
        startDate: "2026-03-01",
        endDate: "2026-03-02",
        type: "Emergency Leave",
        status: "Rejected",
        reason: "Personal matters",
        reviewedBy: "hr_manager",
        reviewedAt: new Date().toISOString(),
        reviewNote: "Not enough emergency leave balance"
      }
    ];

    for (const leave of leaves) {
      await addDoc(collection(db, "leaves"), leave);
      docsInserted++;
    }

    const undertimeRequests = [
      {
        employeeId,
        date: "2026-05-01",
        type: "Early Out",
        timeLost: "2h",
        plannedTimeOut: "06:00 PM",
        actualTimeOut: "04:00 PM",
        reason: "Dental appointment",
        duration: "2h",
        deduction: "₱300",
        status: "Pending Review"
      },
      {
        employeeId,
        date: "2026-04-25",
        type: "Short Hours",
        timeLost: "1h",
        reason: "Felt unwell in the afternoon",
        duration: "1h",
        deduction: "₱150",
        status: "Approved"
      }
    ];

    for (const request of undertimeRequests) {
      await addDoc(collection(db, "undertime"), request);
      docsInserted++;
    }
  }

  console.log(`Finished seeding requests. Inserted ${docsInserted} documents.`);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
