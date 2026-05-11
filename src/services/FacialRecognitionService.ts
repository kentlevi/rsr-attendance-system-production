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
import { Human, Config } from '@vladmandic/human';

const humanConfig: Partial<Config> = {
  modelBasePath: '/models',
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: { return: true, rotation: true },
    mesh: { enabled: true },
    attention: { enabled: false },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
};

export class FacialRecognitionService {
  private profiles: FacialRecognitionProfile[] = [];
  private collectionPath = 'facialRecognitionProfiles';
  private modelsLoaded = false;
  private unsubscribe: Unsubscribe | null = null;
  private human: Human;

  constructor() {
    this.human = new Human(humanConfig);
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
    
    try {
      console.log('Loading Human models...');
      await this.human.load();
      // Optional: run a warmup to compile webgl shaders
      // await this.human.warmup();
      this.modelsLoaded = true;
      console.log('Human models loaded successfully');
    } catch (e) {
      console.error('Failed to load Human models:', e);
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

  async extractFaceDescriptor(base64Image: string): Promise<number[] | null> {
    await this.initModels();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth === 0 || img.naturalHeight === 0) {
             return resolve(null);
          }
          
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

          console.log("Detecting face with @vladmandic/human...");
          const res = await this.human.detect(canvas);
          
          if (res && res.face && res.face.length > 0) {
            console.log("Face detected successfully!");
            const desc = Array.from(res.face[0].embedding || []);
            if (desc.length > 0) {
              resolve(desc);
            } else {
               resolve(null);
            }
          } else {
            console.warn("No face detected in the image.");
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
    let minDistance = 0.5; // Human uses similarity or distance, typically 0.5 is a good default for embedding distance

    for (const profile of this.profiles) {
      const encodings = this.parseFaceEncodings(profile.faceDataEncodings);
        
      if (!encodings || !Array.isArray(encodings) || encodings.length === 0) continue;

      for (const savedDescriptorArray of encodings) {
         if (!savedDescriptorArray || !Array.isArray(savedDescriptorArray)) continue;
          
          const distance = this.human.match.distance(descriptor, savedDescriptorArray);
          
          if (isNaN(distance)) {
            console.warn(`Distance calculation resulted in NaN for profile ${profile.id}. Check descriptor data.`);
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

