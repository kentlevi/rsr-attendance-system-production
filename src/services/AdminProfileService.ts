import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface AdminProfile {
  fullName: string;
  username: string;
  email: string;
  department: string;
  mobile: string;
  position: string;
  gender: string;
  dateRegistered: string;
  address: string;
  lastLogin: string;
  timezone: string;
  role: string;
  avatar: string;
}

class AdminProfileService {
  private collectionPath = "adminProfiles";

  private getProfileRef(username: string) {
    return doc(db, this.collectionPath, username);
  }

  subscribe(
    username: string,
    fallback: AdminProfile,
    listener: (profile: AdminProfile) => void,
  ): () => void {
    return onSnapshot(
      this.getProfileRef(username),
      (snapshot) => {
        if (snapshot.exists()) {
          listener({ ...fallback, ...(snapshot.data() as Partial<AdminProfile>) });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${this.collectionPath}/${username}`);
      },
    );
  }

  async getProfile(username: string, fallback: AdminProfile): Promise<AdminProfile> {
    try {
      const snapshot = await getDoc(this.getProfileRef(username));
      if (snapshot.exists()) {
        return { ...fallback, ...(snapshot.data() as Partial<AdminProfile>) };
      }

      await this.updateProfile(username, fallback);
      return fallback;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionPath}/${username}`);
      return fallback;
    }
  }

  async updateProfile(username: string, updates: Partial<AdminProfile>): Promise<void> {
    try {
      await setDoc(this.getProfileRef(username), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionPath}/${username}`);
    }
  }
}

export const adminProfileService = new AdminProfileService();
