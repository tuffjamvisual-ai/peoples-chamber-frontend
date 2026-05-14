import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  revalidatePath('/departments/treasury');
  return NextResponse.json({ revalidated: true, path: '/departments/treasury' });
}
