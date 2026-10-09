export type VerificationStatus = 'Verified' | 'Pending Review' | 'Discrepancy Found' | 'In Progress';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Restricted';

export interface VerificationRecord {
  id: string;
  candidateName: string;
  candidateRole: string;
  verificationType: string;
  submittedBy: string;
  status: VerificationStatus;
  riskLevel: RiskLevel;
  accessLevel: string;
  blockchainHash: string;
  dateInitiated: string;
  notes?: string;
  isAdminView?: boolean;
}

export interface RecordsResponse {
  success: boolean;
  totalCount: number;
  accessRole: string;
  requestedBy: string;
  records: VerificationRecord[];
}
