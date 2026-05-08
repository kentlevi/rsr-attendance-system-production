import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateLogsForEmployee(employeeId: string, daysAssigned: number) {
  const logs = [];
  const now = new Date();
  
  for (let i = 0; i < daysAssigned; i++) {
    const logDate = new Date(now);
    logDate.setDate(now.getDate() - i);
    // skip weekends
    if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
    
    const isLate = Math.random() > 0.8;
    const isUndertime = Math.random() > 0.8;
    
    // Default 9 AM to 6 PM
    const baseHourIn = isLate ? getRandomInt(9, 10) : 8;
    const baseMinIn = isLate ? getRandomInt(1, 59) : getRandomInt(30, 59);
    
    const baseHourOut = isUndertime ? getRandomInt(16, 17) : 18;
    const baseMinOut = isUndertime ? getRandomInt(0, 59) : getRandomInt(0, 30);
    
    const timeInStr = `${baseHourIn.toString().padStart(2, '0')}:${baseMinIn.toString().padStart(2, '0')} AM`;
    const timeOutStr = `${(baseHourOut > 12 ? baseHourOut - 12 : baseHourOut).toString().padStart(2, '0')}:${baseMinOut.toString().padStart(2, '0')} PM`;
    
    let workHours = (baseHourOut + baseMinOut/60) - (baseHourIn + baseMinIn/60) - 1; // standard lunch break subtracted
    if(workHours < 0) workHours = 0;

    let lateMinutes = isLate ? ((baseHourIn - 9) * 60 + baseMinIn) : 0;
    if(lateMinutes < 0) lateMinutes = 0;
    
    let undertimeMinutes = isUndertime ? ((18 - baseHourOut) * 60 - baseMinOut) : 0;
    if(undertimeMinutes < 0) undertimeMinutes = 0;

    let status = isLate ? 'Late' : 'Present';
    if(undertimeMinutes > 0) status = 'Late'; // could be considered late or undertime, in the app it's usually Present/Late/Absent

    logs.push({
      employeeId,
      date: logDate.toISOString().split('T')[0],
      timeIn: timeInStr,
      timeOut: timeOutStr,
      actualTimeIn: timeInStr,
      actualTimeOut: timeOutStr,
      workHours: workHours.toFixed(2) + 'h',
      overtime: '0h',
      status: status,
      location: 'Office',
      lateMinutes,
      undertimeMinutes,
      attendanceApprovalStatus: 'Approved'
    });
  }
  return logs;
}

async function main() {
  const employeesRef = collection(db, "employees");
  const qs = await getDocs(employeesRef);
  
  let firstEmployee = true;
  for (const docSnap of qs.docs) {
    const data = docSnap.data();
    
    if (firstEmployee) {
        // Enforce the first employee has a facial recognition ID
        await updateDoc(doc(db, "employees", docSnap.id), {
            facialRecognitionProfileId: "dummy-face-123"
        });
        firstEmployee = false;
        
        // Let's also insert a facial recognition profile
        await addDoc(collection(db, "facialRecognitionProfiles"), {
            profileId: "dummy-face-123",
            employeeId: docSnap.id,
            enrolledAt: new Date().toISOString(),
            status: "active"
        });
    }

    const employeeLogs = generateLogsForEmployee(docSnap.id, 14); // generated last 2 weeks
    let addedLogs = 0;
    for (const log of employeeLogs) {
      await addDoc(collection(db, "attendance"), log);
      addedLogs++;
    }
    console.log(`Added ${addedLogs} logs for employee ${data.email}.`);
  }
  
  console.log('Finished seeding attendance.');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
