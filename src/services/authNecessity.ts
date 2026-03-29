import { necessityRequest, necessityFormRequest, getNecessityErrorMessage } from './necessity';
import type { AuthData } from 'src/types/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  gstNumber: string;
  panNumber: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    gstNumber: string;
    panNumber: string;
    status: string;
    isActive: boolean;
    _id: string;
    registeredAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await necessityRequest<RegisterResponse>('/api/customers/register', {
    method: 'POST',
    body: payload,
  });
  return response;
}

export async function login(payload: LoginPayload): Promise<AuthData> {
  const response = await necessityRequest<{
    success: boolean;
    message: string;
    data: {
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        roleId: string;
        isActive: boolean;
      };
      token: string;
    };
  }>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });

  const { user, token: rawToken } = response.data;
  const token = String(rawToken ?? '')
    .trim()
    .replace(/^Bearer\s+/i, '');

  const rawSeg = (user as { customerSegment?: unknown }).customerSegment;
  const normalizedSegment: 'NEW' | 'REGULAR' | undefined =
    typeof rawSeg === 'string'
      ? rawSeg.trim().toUpperCase() === 'REGULAR'
        ? 'REGULAR'
        : rawSeg.trim().toUpperCase() === 'NEW'
          ? 'NEW'
          : undefined
      : undefined;

  // Map to compatible User object
  const mappedUser: AuthData['user'] = {
    ...user,
    uuid: user.id,
    full_name: user.name,
    is_active: user.isActive,
    mobile_number: '', // Backend doesn't provide this in login response
    customerSegment: normalizedSegment ?? 'NEW',
    allowPartialPayment: Boolean((user as { allowPartialPayment?: boolean }).allowPartialPayment),
  };

  return {
    token,
    user: mappedUser,
  };
}


export async function logout(): Promise<void> {
  // Necessity B2B API has no server-side session revoke; local token is cleared in logoutThunk.
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

interface ChangePasswordNecessityResponse {
  success: boolean;
  message: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  const response = await necessityRequest<ChangePasswordNecessityResponse>(
    '/necessity/v1/auth/change-password',
    {
      method: 'POST',
      body: payload,
    }
  );

  if (!response.success) {
    const necessityErr = new Error(response.message || 'Failed to change password') as import('./necessity').NecessityError;
    necessityErr.data = { message: response.message };
    throw necessityErr;
  }
}



export interface UpdateUserPayload {
  full_name?: string;
  mobile_number?: string;
  role?: string;
  district_uuid?: string;
  photo_url?: string;
  status?: string;
  profile_image?: {
    uri: string;
    fileName?: string;
    type?: string;
  };
}

interface UpdateUserNecessitySuccess {
  success: true;
  message: string;
  data: AuthData['user'];
}

interface UpdateUserNecessityFailure {
  success: false;
  message: string;
  error?: string;
}

type UpdateUserNecessityResponse = UpdateUserNecessitySuccess | UpdateUserNecessityFailure;

export async function updateUser(
  trainerUuid: string,
  payload: UpdateUserPayload
): Promise<AuthData['user']> {

  const formData = new FormData();

  if (payload.full_name !== undefined)
    formData.append('full_name', payload.full_name);

  if (payload.mobile_number !== undefined)
    formData.append('mobile_number', payload.mobile_number);

  if (payload.role !== undefined)
    formData.append('role', payload.role);

  if (payload.district_uuid !== undefined)
    formData.append('district_uuid', payload.district_uuid);

  if (payload.status !== undefined)
    formData.append('status', payload.status);

  if (payload.profile_image) {
    const image = payload.profile_image;
    formData.append('profile_image', {
      uri: image.uri,
      name: image.fileName || `photo_${Date.now()}.jpg`,
      type: image.type || 'image/jpeg',
    } as any);
  }

  const response = await necessityFormRequest<UpdateUserNecessityResponse>(
    `/necessity/v1/users/${trainerUuid}`,
    {
      method: 'PUT',
      body: formData,
    }
  );

  if (response.success && (response as UpdateUserNecessitySuccess).data) {
    return (response as UpdateUserNecessitySuccess).data;
  }

  const failure = response as UpdateUserNecessityFailure;
  const necessityErr = new Error(
    failure.message || failure.error || 'Update failed'
  ) as import('./necessity').NecessityError;

  necessityErr.data = { message: failure.message, error: failure.error };
  throw necessityErr;
}


interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  const response = await necessityRequest<ForgotPasswordResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
  return response;
}

export interface CurrentUserResponse {
  success: boolean;
  message?: string;
  data: {
    id: string;
    email: string;
    name: string;
    businessName?: string;
    phone?: string;
    gstNumber?: string;
    panNumber?: string;
    role: string;
    roleId: string;
    isActive: boolean;
    status?: string;
    customerSegment?: 'NEW' | 'REGULAR';
    allowPartialPayment?: boolean;
  };
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return necessityRequest<CurrentUserResponse>('/api/auth/me', {
    method: 'GET',
  });
}

export { getNecessityErrorMessage };
