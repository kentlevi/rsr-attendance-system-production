import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const empId = `emp-${Date.now()}`;
  await setDoc(doc(db, "employees", empId), {
    id: empId,
    name: "John Doe",
    pin: "123456",
    email: "john.doe@example.com",
    department: "Engineering",
    position: "Software Engineer",
    status: "Active",
    avatar: `https://i.pravatar.cc/150?u=${empId}`,
    phone: "555-0100",
    dateHired: new Date().toISOString(),
    gender: "Male",
    employmentType: "Full-Time",
    vlBalance: 15,
    slBalance: 10
  });

  console.log(`Created employee: ${empId} (PIN: 123456)`);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
