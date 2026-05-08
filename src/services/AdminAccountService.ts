import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import type { AdminProfile } from "./AdminProfileService";

export interface AdminAccountRecord extends AdminProfile {
  password: string;
}

class AdminAccountService {
  private collectionPath = "adminAccounts";

  private getAccountRef(loginId: string) {
    return doc(db, this.collectionPath, loginId);
  }

  async getAccount(
    loginId: string,
    fallback: AdminAccountRecord,
  ): Promise<AdminAccountRecord> {
    try {
      const snapshot = await getDoc(this.getAccountRef(loginId));
      if (snapshot.exists()) {
        return { ...fallback, ...(snapshot.data() as Partial<AdminAccountRecord>) };
      }

      await this.updateAccount(loginId, fallback);
      return fallback;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionPath}/${loginId}`);
      return fallback;
    }
  }

  async updateAccount(
    loginId: string,
    updates: Partial<AdminAccountRecord>,
  ): Promise<void> {
    try {
      await setDoc(this.getAccountRef(loginId), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionPath}/${loginId}`);
    }
  }

  async updateProfile(loginId: string, profile: Partial<AdminProfile>): Promise<void> {
    await this.updateAccount(loginId, profile);
  }

  async updatePassword(loginId: string, password: string): Promise<void> {
    await this.updateAccount(loginId, { password });
  }
}

export const adminAccountService = new AdminAccountService();
