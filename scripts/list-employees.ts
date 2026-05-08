import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const qs = await getDocs(collection(db, "employees"));
  if (qs.empty) {
      console.log('No employees found');
  }
  qs.forEach(doc => {
    console.log(doc.data().email, doc.data().pin, doc.data().status);
  });
  setTimeout(() => process.exit(0), 1000);
}
main().catch(console.error);
