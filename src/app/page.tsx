import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  // Check if any users exist in the database
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    // If it's the very first time and no users exist, force signup
    redirect('/signup');
  }

  // If users exist, check if the current user is logged in
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Otherwise, go straight to the dashboard
  redirect('/dashboard');
}
