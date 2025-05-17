import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Token cookie'sini sil
  response.cookies.delete('token');
  
  return response;
} 