import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const employeesRef = collection(db, "employees");
  const qs = await getDocs(employeesRef);
  
  let mapCount = 0;
  for (const docSnap of qs.docs) {
    const data = docSnap.data();
    if (!data.supervisor) {
      await updateDoc(doc(db, "employees", docSnap.id), {
        supervisor: "hr_manager"
      });
      mapCount++;
    }
  }
  
  console.log(`Mapped ${mapCount} employees to supervisor 'hr_manager'.`);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
