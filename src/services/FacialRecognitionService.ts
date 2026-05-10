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
      this.profiles = snapshot.docs.map((snapshotDoc) => ({
        ...snapshotDoc.data(),
        id: snapshotDoc.id,
      } as FacialRecognitionProfile));
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
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      this.modelsLoaded = true;
    } catch (e) {
      console.error("Failed to load face-api models", e);
    }
  }

  async loadProfiles(): Promise<FacialRecognitionProfile[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionPath));
      this.profiles = querySnapshot.docs.map((snapshotDoc) => ({
        ...snapshotDoc.data(),
        id: snapshotDoc.id,
      } as FacialRecognitionProfile));
    } catch (error) {
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
          const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
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
        faceDataEncodings: faceData,
        createdAt: newProfile.createdAt,
      });
      this.profiles = [
        ...this.profiles.filter((profile) => profile.id !== profileId),
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
    let minDistance = 0.5; // threshold (0.5 is safe for face recognition, 0.6 is default)

    for (const profile of this.profiles) {
      const encodings = profile.faceDataEncodings as any as number[][];
      if (!encodings || encodings.length === 0) continue;

      for (const savedDescriptorArray of encodings) {
         if (!savedDescriptorArray) continue;
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
