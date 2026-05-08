import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import { Employee } from '../src/models/Employee';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const dummyEmployees: any[] = [
  {
    name: "Alex Smith",
    email: "alex.smith@example.com",
    department: "Engineering",
    position: "Senior Software Engineer",
    status: "Active",
    pin: "111111",
    dateHired: new Date("2023-01-15").toISOString(),
    dailyRate: "120000",
    avatar: "",
    vlBalance: 15,
    slBalance: 10,
    weeklyAllowance: 500
  },
  {
    name: "Maria Garcia",
    email: "maria.garcia@example.com",
    department: "Marketing",
    position: "Marketing Manager",
    status: "Active",
    pin: "222222",
    dateHired: new Date("2022-03-01").toISOString(),
    dailyRate: "95000",
    avatar: "",
    vlBalance: 20,
    slBalance: 12,
    weeklyAllowance: 300
  },
  {
    name: "James Johnson",
    email: "james.johnson@example.com",
    department: "Sales",
    position: "Account Executive",
    status: "Active",
    pin: "333333",
    dateHired: new Date("2021-06-10").toISOString(),
    dailyRate: "85000",
    avatar: "",
    vlBalance: 10,
    slBalance: 8,
    weeklyAllowance: 400
  },
  {
    name: "Emily Chen",
    email: "emily.chen@example.com",
    department: "HR",
    position: "HR Specialist",
    status: "Active",
    pin: "444444",
    dateHired: new Date("2023-08-20").toISOString(),
    dailyRate: "75000",
    avatar: "",
    vlBalance: 15,
    slBalance: 10,
    weeklyAllowance: 200
  },
  {
    name: "David Wilson",
    email: "david.wilson@example.com",
    department: "IT",
    position: "Systems Administrator",
    status: "On Leave",
    pin: "555555",
    dateHired: new Date("2020-11-05").toISOString(),
    dailyRate: "90000",
    avatar: "",
    vlBalance: 5,
    slBalance: 2,
    weeklyAllowance: 350
  },
  {
    name: "Sarah Brown",
    email: "sarah.brown@example.com",
    department: "Engineering",
    position: "Frontend Developer",
    status: "Active",
    pin: "666666",
    dateHired: new Date("2024-02-10").toISOString(),
    dailyRate: "100000",
    avatar: "",
    vlBalance: 10,
    slBalance: 8,
    weeklyAllowance: 450
  },
  {
    name: "Michael Taylor",
    email: "michael.taylor@example.com",
    department: "Sales",
    position: "Sales Director",
    status: "Active",
    pin: "777777",
    dateHired: new Date("2019-09-15").toISOString(),
    dailyRate: "150000",
    avatar: "",
    vlBalance: 25,
    slBalance: 15,
    weeklyAllowance: 600
  },
  {
    name: "Jessica Thomas",
    email: "jessica.thomas@example.com",
    department: "Marketing",
    position: "Content Strategist",
    status: "Inactive",
    pin: "888888",
    dateHired: new Date("2021-04-01").toISOString(),
    dailyRate: "80000",
    avatar: "",
    vlBalance: 0,
    slBalance: 0,
    weeklyAllowance: 0
  },
  {
    name: "Robert Martinez",
    email: "robert.martinez@example.com",
    department: "Customer Support",
    position: "Support Agent",
    status: "Active",
    pin: "999999",
    dateHired: new Date("2023-11-25").toISOString(),
    dailyRate: "60000",
    avatar: "",
    vlBalance: 12,
    slBalance: 10,
    weeklyAllowance: 150
  },
  {
    name: "Jessica Lee",
    email: "jessica.lee@example.com",
    department: "Customer Support",
    position: "Support Supervisor",
    status: "Inactive",
    pin: "121212",
    dateHired: new Date("2020-02-14").toISOString(),
    dailyRate: "80000",
    avatar: "",
    vlBalance: 18,
    slBalance: 12,
    weeklyAllowance: 250
  }
];

async function main() {
  const employeesRef = collection(db, "employees");
  
  // Clear existing dummy employees (optional, maybe we just want to clear ones with example.com)
  const qs = await getDocs(employeesRef);
  let deleteCount = 0;
  for (const docSnap of qs.docs) {
    if (docSnap.data().email && docSnap.data().email.includes('@example.com')) {
      await deleteDoc(doc(db, "employees", docSnap.id));
      deleteCount++;
    }
  }
  console.log(`Deleted ${deleteCount} existing dummy employees.`);

  // Insert new dummy employees
  let insertCount = 0;
  for (const employee of dummyEmployees) {
    await addDoc(employeesRef, employee);
    insertCount++;
  }
  console.log(`Inserted ${insertCount} new dummy employees.`);

  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
