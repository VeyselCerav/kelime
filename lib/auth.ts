import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar';

export async function getUserFromToken(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    return {
      id: payload.userId as number,
      username: payload.username as string,
    };
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return null;
  }
}

export function getAuthCookie() {
  const cookieStore = cookies();
  return cookieStore.get('token')?.value;
} 