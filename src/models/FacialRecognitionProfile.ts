export class FacialRecognitionProfile {
  id: string;
  employeeId: string;
  faceDataEncodings: number[][]; // Store embeddings
  createdAt: string;

  constructor(id: string, employeeId: string, faceDataEncodings: number[][], createdAt: string) {
    this.id = id;
    this.employeeId = employeeId;
    this.faceDataEncodings = faceDataEncodings;
    this.createdAt = createdAt;
  }
}
