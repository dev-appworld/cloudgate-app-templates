export interface IdpProfile {
  id: number | string;
  email?: string;
  name?: string;
  surname?: string;
  photoUrl?: string | null;
  role?: string | null;
}

export interface AppUser {
  user: {
    id: number | string;
    name: string;
    surname: string;
    emailAddress: string;
    userName: string;
    photoUrl?: string;
    role?: string | null;
  };
  tenant: { tenancyName: string };
}

export interface IdpTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  returnUrl?: string;
}

export function getProfileDisplayName(profile?: {
  name?: string;
  surname?: string;
  email?: string;
  emailAddress?: string;
}): string {
  const namePart = [profile?.name, profile?.surname].filter(Boolean).join(' ').trim();
  return namePart || profile?.email || profile?.emailAddress || 'User';
}

export function getProfilePictureSrc(profile?: { photoUrl?: string | null; PhotoUrl?: string | null }) {
  const photoUrl = profile?.photoUrl ?? profile?.PhotoUrl;
  return photoUrl && typeof photoUrl === 'string' ? photoUrl.trim() || undefined : undefined;
}
