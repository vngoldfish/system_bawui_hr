import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const createPositionSchema = z.object({
  name: z.string().min(1, '役職名は必須です'),
  nameKana: z.string().min(1, '役職名（カナ）は必須です'),
  description: z.string().optional().nullable(),
  allowance: z.number().nonnegative('手当は0以上にする必要があります').optional().default(0),
});

// GET all positions
export async function GET() {
  try {
    const positions = await prisma.position.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    return successResponse(positions);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new position
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPositionSchema.parse(body);

    const position = await prisma.position.create({ data });
    return createdResponse(position);
  } catch (error) {
    return handleApiError(error);
  }
}
