export interface District {
  uuid: string;
  code: string;
  name: string;
  region: string;
}

export interface User {
  id: string;
  uuid: string;
  name: string;
  full_name: string;
  email: string;
  mobile_number: string;
  role: string;
  roleId: string;
  isActive: boolean;
  is_active: boolean;
  district?: District;
  training_hours?: number;
  status?: string;
  photo_url?: string;
  /** From B2B backend: REGULAR unlocks installment cash-discount options at checkout */
  customerSegment?: 'NEW' | 'REGULAR';
  allowPartialPayment?: boolean;
}

export interface AuthData {
  token: string;
  refresh_token?: string;
  user: User;
}

