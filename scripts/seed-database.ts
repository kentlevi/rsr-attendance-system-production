import { execSync } from 'child_process';

const runScript = (scriptName: string) => {
  console.log(`\n--- Running ${scriptName} ---`);
  try {
    execSync(`npx tsx scripts/${scriptName}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error running ${scriptName}:`, err);
  }
}

function main() {
  console.log("Starting full database seeding process...");
  
  runScript('seed-employees.ts');
  runScript('seed-admins.ts');
  runScript('seed-relationships.ts');
  runScript('seed-attendance.ts');
  runScript('seed-requests.ts');
  runScript('seed-allowances.ts');
  runScript('seed-notifications.ts');

  console.log("\nFull database seeding process completed!");
}

main();
