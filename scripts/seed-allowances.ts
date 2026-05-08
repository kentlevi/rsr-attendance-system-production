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
    const employeeData = docSnap.data();

    // Only give dummy allowances if weekAllowance is set
    if (employeeData.weeklyAllowance > 0) {
      const records = [
        {
          employeeId,
          date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // 1 week ago
          baseAllowance: `₱${employeeData.weeklyAllowance}`,
          otBonus: "₱0",
          override: "",
          finalAmount: `₱${employeeData.weeklyAllowance}`,
          isOverride: false
        },
        {
          employeeId,
          date: new Date().toISOString().split('T')[0],
          baseAllowance: `₱${employeeData.weeklyAllowance}`,
          otBonus: "₱50",
          override: `₱${employeeData.weeklyAllowance + 50}`,
          finalAmount: `₱${employeeData.weeklyAllowance + 50}`,
          isOverride: true
        }
      ];

      for (const record of records) {
        await addDoc(collection(db, "allowances"), record);
        docsInserted++;
      }
    }
  }

  console.log(`Finished seeding allowances. Inserted ${docsInserted} documents.`);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
