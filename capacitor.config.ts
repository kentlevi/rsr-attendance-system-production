import type { CapacitorConfig } from '@capacitor/cli';

// APK loads bundled assets from `webDir` (dist/) — true offline-first.
// Firebase / API calls still go to the cloud at runtime. UI bug fixes now
// require a new APK build; the in-app update banner (services/AppVersionService)
// surfaces those releases to users.
//
// Do NOT add `server.url` here unless you accept that the APK becomes a thin
// wrapper around a remote URL and stops working when that URL is unreachable.
const config: CapacitorConfig = {
  appId: 'com.rsrengineering.attendance',
  appName: 'RSR Attendance',
  webDir: 'dist',
};

export default config;
