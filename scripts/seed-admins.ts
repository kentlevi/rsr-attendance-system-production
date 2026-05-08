import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const defaultAdmins = [
  {
    loginId: "admin",
    password: "password123",
    fullName: "System Admin",
    username: "admin",
    email: "admin@rsr.com",
    department: "Administration",
    mobile: "09000000000",
    position: "System Administrator",
    gender: "Male",
    dateRegistered: new Date().toISOString(),
    address: "RSR HQ",
    lastLogin: new Date().toISOString(),
    timezone: "Asia/Manila",
    role: "Admin",
    avatar: ""
  },
  {
    loginId: "hr_manager",
    password: "password123",
    fullName: "HR Manager",
    username: "hr_manager",
    email: "hr@rsr.com",
    department: "Human Resources",
    mobile: "09111111111",
    position: "HR Manager",
    gender: "Female",
    dateRegistered: new Date().toISOString(),
    address: "RSR HQ",
    lastLogin: new Date().toISOString(),
    timezone: "Asia/Manila",
    role: "HR",
    avatar: ""
  }
];

async function main() {
  let count = 0;
  for (const admin of defaultAdmins) {
    const { loginId, password, ...profile } = admin;
    
    // Seed admin accounts
    await setDoc(doc(db, "adminAccounts", loginId), {
      ...profile,
      password
    }, { merge: true });

    // Seed admin profiles
    await setDoc(doc(db, "adminProfiles", loginId), profile, { merge: true });
    
    count++;
  }
  
  console.log(`Seeded ${count} admin accounts.`);
  
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
