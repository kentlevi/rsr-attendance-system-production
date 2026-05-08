import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const employeesRef = collection(db, "employees");
  const qs = await getDocs(employeesRef);
  
  if (qs.empty) {
    console.log("No employees found. Run seed-employees first.");
  }
  
  let docsInserted = 0;

  const now = new Date();
  const notifications = [
    {
      title: "New Leave Request",
      message: "Sarah Brown requested 3 days of Vacation Leave.",
      time: "10 mins ago",
      type: "user",
      isRead: false,
      createdAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      targetRole: "admin",
      employeeId: ""
    },
    {
      title: "Database Backup",
      message: "Daily Database Backup completed successfully.",
      time: "1 hour ago",
      type: "success",
      isRead: true,
      createdAt: new Date(now.getTime() - 60 * 60000).toISOString(),
      targetRole: "admin",
      employeeId: ""
    },
    {
      title: "System Maintenance",
      message: "Scheduled maintenance will occur this weekend at 12:00 AM.",
      time: "2 hours ago",
      type: "warning",
      isRead: false,
      createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
      targetRole: "all",
      employeeId: ""
    }
  ];

  for (const notif of notifications) {
    await addDoc(collection(db, "notifications"), notif);
    docsInserted++;
  }
  
  // Seed for specific employees
  const firstEmployee = qs.docs[0];
  if (firstEmployee) {
    await addDoc(collection(db, "notifications"), {
      title: "Leave Approved",
      message: "Your Vacation Leave has been approved.",
      time: "1 day ago",
      type: "success",
      isRead: false,
      createdAt: new Date(now.getTime() - 24 * 60 * 60000).toISOString(),
      employeeId: firstEmployee.id,
    });
    docsInserted++;
  }

  const smsLogs = [
    {
      name: "Michael Taylor",
      phone: "09170000000",
      preview: "Reminder: You have accumulated 3 late arrivals this week.",
      status: "Delivered",
      sentAt: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
    },
    {
      name: "David Wilson",
      phone: "09171111111",
      preview: "AWOL Warning: You have not reported to work today without notifying HR.",
      status: "Pending",
      sentAt: new Date(now.getTime() - 10 * 60000).toISOString(),
    }
  ];

  for (const sms of smsLogs) {
    await addDoc(collection(db, "sms_logs"), sms);
    docsInserted++;
  }

  console.log(`Finished seeding notifications and SMS logs. Inserted ${docsInserted} documents.`);
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
