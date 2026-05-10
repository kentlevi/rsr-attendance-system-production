import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function main() {
  const users = [
    { email: "admin@rsr.com", password: "password123" },
    { email: "admin@rsrengineering.com", password: "password123" },
    { email: "hr@rsr.com", password: "password123" },
    { email: "assistant@rsrengineering.com", password: "password123" },
  ];

  for (const user of users) {
    try {
      await createUserWithEmailAndPassword(auth, user.email, user.password);
      console.log("Created user:", user.email);
    } catch (err) {
      console.error("Error creating user:", user.email, err.code);
    }
  }
  process.exit();
}

main();
