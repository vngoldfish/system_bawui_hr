import { prisma } from '@/lib/prisma';
import LoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
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
