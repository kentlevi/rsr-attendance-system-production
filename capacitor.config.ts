import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rsrengineering.attendance',
  appName: 'RSR Attendance',
  webDir: 'dist',
  server: {
    url: 'https://rsr-smart-attendance.onrender.com',
    cleartext: true
  }
};

export default config;
