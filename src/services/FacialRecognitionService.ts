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
    if (this.modelsLoaded || typeof window === 'undefined' || process.env.NODE_ENV === 'test' || process.env.VITEST) return;
    
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
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
        this.modelsLoaded = true;
        console.log("Face-api models loaded successfully");
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
          faceDataEncodings: typeof data.faceDataEncodings === 'string' 
            ? JSON.parse(data.faceDataEncodings) 
            : data.faceDataEncodings,
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
          // Use a larger input size for better detection accuracy if possible
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });
          const detections = await faceapi.detectSingleFace(img, options).withFaceLandmarks().withFaceDescriptor();
          
          if (detections) {
            resolve(Array.from(detections.descriptor));
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
    let minDistance = 0.6; // Increased threshold for better recognition (default face-api.js threshold is 0.6)

    for (const profile of this.profiles) {
      const encodingsString = profile.faceDataEncodings;
      const encodings = typeof encodingsString === 'string' 
        ? JSON.parse(encodingsString) 
        : encodingsString;
        
      if (!encodings || !Array.isArray(encodings) || encodings.length === 0) continue;

      for (const savedDescriptorArray of encodings) {
         if (!savedDescriptorArray || !Array.isArray(savedDescriptorArray)) continue;
         const savedDescriptor = new Float32Array(savedDescriptorArray);
         const currentDescriptor = new Float32Array(descriptor);
         
         const distance = faceapi.euclideanDistance(savedDescriptor, currentDescriptor);
         if (distance < minDistance) {
           minDistance = distance;
           bestMatchEmployeeId = profile.employeeId;
         }
      }
    }

    return bestMatchEmployeeId;
  }
}

export const facialRecognitionService = new FacialRecognitionService();
