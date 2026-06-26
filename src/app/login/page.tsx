import { prisma } from '@/lib/prisma';
import LoginForm from '@/components/auth/LoginForm';
import { Suspense } from 'react';
import { connection } from 'next/server';

async function LoginLoader() {
  await connection();
  let companyName = '株式会社ロング';
  try {
    const company = await prisma.company.findFirst();
    if (company?.name) {
      companyName = company.name;
    }
  } catch (e) {
    // Ignore, fallback to default
  }

  return <LoginForm companyName={companyName} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
      <LoginLoader />
    </Suspense>
  );
}
