import { FacialRecognitionProfile } from '../models/FacialRecognitionProfile';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import * as faceapi from '@vladmandic/face-api';

export class FacialRecognitionService {
  private profiles: FacialRecognitionProfile[] = [];
  private collectionPath = 'facialRecognitionProfiles';
  private modelsLoaded = false;
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    this.initModels();
  }

  public initializeForAdmin() {
    if (this.unsubscribe) {
       this.unsubscribe();
       this.unsubscribe = null;
    }
    this.unsubscribe = onSnapshot(collection(db, this.collectionPath), (snapshot) => {
      this.profiles = snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        return {
          ...data,
          id: snapshotDoc.id,
          faceDataEncodings: typeof data.faceDataEncodings === 'string' 
            ? JSON.parse(data.faceDataEncodings) 
            : data.faceDataEncodings,
        } as FacialRecognitionProfile;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
  }

  public stopSubscription() {
     if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
     }
  }

  async initModels() {
    if (this.modelsLoaded || typeof window === 'undefined' || (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST))) return;
    
    // Attempt to load models with retries
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts && !this.modelsLoaded) {
      try {
        console.log(`Loading face-api models (attempt ${attempts + 1})...`);
        
        // Wait for tf to be ready and available
        if ((faceapi as any).tf) {
          await (faceapi as any).tf.ready();
        }

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
        this.modelsLoaded = true;
        console.log("Face-api models loaded successfully:", {
          ssdMobilenetv1: faceapi.nets.ssdMobilenetv1.isLoaded,
          faceLandmark68Net: faceapi.nets.faceLandmark68Net.isLoaded,
          faceRecognitionNet: faceapi.nets.faceRecognitionNet.isLoaded
        });
      } catch (e) {
        attempts++;
        console.error(`Attempt ${attempts} failed to load face-api models:`, e);
        if (attempts >= maxAttempts) {
          console.error("Critical: Failed to load face-api models after multiple attempts.");
        } else {
          // Wait a bit before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  async loadProfiles(): Promise<FacialRecognitionProfile[]> {
    try {
      console.log("Fetching facial recognition profiles...");
      const querySnapshot = await getDocs(collection(db, this.collectionPath));
      this.profiles = querySnapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        return {
          ...data,
          id: snapshotDoc.id,
          faceDataEncodings: this.parseFaceEncodings(data.faceDataEncodings),
        } as FacialRecognitionProfile;
      });
      console.log(`Loaded ${this.profiles.length} profiles.`);
    } catch (error) {
      console.error("Failed to load facial recognition profiles:", error);
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    }

    return this.profiles;
  }

  // Returns array of 128 numbers (Float32Array converted to Array)
  async extractFaceDescriptor(base64Image: string): Promise<number[] | null> {
    await this.initModels();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth === 0 || img.naturalHeight === 0) {
             return resolve(null);
          }
          
          // Draw image to a canvas to bypass HTMLImageElement layout quirks in face-api.js
          // Limit canvas size for better performance and detection stability
          const maxDim = 600;
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width *= ratio;
            height *= ratio;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          // SSD MobileNet V1 is more accurate than TinyFaceDetector
          // Lowering minConfidence even further to 0.2 for difficult lighting
          const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 });
          console.log("Detecting face with SSD MobileNet V1 (minConfidence: 0.2)...");
          const detections = await faceapi.detectSingleFace(canvas, options).withFaceLandmarks().withFaceDescriptor();
          
          if (detections) {
            console.log("Face detected successfully!");
          } else {
            console.warn("No face detected in the image.");
          }
          
          if (detections && detections.descriptor) {
            const desc = Array.from(detections.descriptor);
            const hasNaN = desc.some(v => isNaN(v));
            console.log(`Live descriptor generated. Length: ${desc.length}, Has NaN: ${hasNaN}`);
            if (hasNaN) {
              console.warn("Live descriptor contains NaN values!");
            }
            resolve(desc);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Error recognizing face", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = base64Image;
    });
  }

  async registerFace(employeeId: string, faceData: number[][]): Promise<string> {
    const profileId = `${employeeId}-${Date.now()}`;
    const newProfile = new FacialRecognitionProfile(
      profileId,
      employeeId,
      faceData,
      new Date().toISOString()
    );

    try {
      await setDoc(doc(db, this.collectionPath, profileId), {
        id: newProfile.id,
        employeeId: newProfile.employeeId,
        faceDataEncodings: JSON.stringify(faceData),
        createdAt: newProfile.createdAt,
      });
      // Update local cache
      this.profiles = [
        ...this.profiles.filter((profile) => profile.employeeId !== employeeId),
        newProfile,
      ];
      return profileId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${this.collectionPath}/${profileId}`);
    }

    return profileId;
  }

  async verifyFace(base64Image: string): Promise<string | null> {
    if (!base64Image) return null;

    if (this.profiles.length === 0) {
      await this.loadProfiles();
    }

    const descriptor = await this.extractFaceDescriptor(base64Image);
    if (!descriptor) return null;

    let bestMatchEmployeeId: string | null = null;
    let minDistance = 0.70; // Increased threshold to 0.70 for maximum leniency in difficult lighting

    for (const profile of this.profiles) {
      const encodings = this.parseFaceEncodings(profile.faceDataEncodings);
        
      if (!encodings || !Array.isArray(encodings) || encodings.length === 0) continue;

      for (const savedDescriptorArray of encodings) {
         if (!savedDescriptorArray || !Array.isArray(savedDescriptorArray)) continue;
          const savedDescriptor = new Float32Array(savedDescriptorArray);
          const currentDescriptor = new Float32Array(descriptor);
          
          const distance = faceapi.euclideanDistance(savedDescriptor, currentDescriptor);
          
          if (isNaN(distance)) {
            console.warn(`Distance calculation resulted in NaN for profile ${profile.id}. Check descriptor data.`);
            console.log(`Saved descriptor (first 5): ${Array.from(savedDescriptor.slice(0, 5))}`);
            console.log(`Current descriptor (first 5): ${Array.from(currentDescriptor.slice(0, 5))}`);
            continue;
          }
          
          console.log(`Face match distance for ${profile.employeeId}: ${distance.toFixed(4)} (Threshold: ${minDistance})`);
          
          if (distance < minDistance) {
            minDistance = distance;
            bestMatchEmployeeId = profile.employeeId;
          }
      }
    }

    return bestMatchEmployeeId;
  }

  private parseFaceEncodings(value: unknown): number[][] | null {
    if (!value) return null;
    if (Array.isArray(value)) return value as number[][];

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as number[][] : null;
      } catch (error) {
        console.warn('Skipping malformed facial recognition profile encoding.', error);
        return null;
      }
    }

    return null;
  }
}

export const facialRecognitionService = new FacialRecognitionService();
