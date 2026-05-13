import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from 'papaparse';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateToISO(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function formatISOToDisplay(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

export function formatTimeTo12h(timeStr: string | undefined): string {
  if (!timeStr) return "";
  try {
    // Handle potential weird formatting like (,08:00,)
    const cleanTime = timeStr.replace(/[\(\),]/g, '').trim();
    if (!cleanTime.includes(':')) return timeStr;
    
    const [hours, minutes] = cleanTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

export async function resizeImage(base64: string, maxWidth = 400, maxHeight = 400): Promise<string> {
  if (!base64 || !base64.startsWith('data:image')) return base64;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64);
  });
}

export function downloadCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function getFirebasePassword(pin: string): string {
  if (!pin) return "";
  // Firebase Auth requires at least 6 characters.
  // We pad with zeros to ensure consistency.
  return pin.padEnd(6, '0');
}

