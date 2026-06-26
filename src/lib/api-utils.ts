import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export function serializeDates<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeDates(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeDates(item)])
    ) as T;
  }

  return value;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(serializeDates(data), { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json(serializeDates(data), { status: 201 });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function validationErrorResponse(error: ZodError) {
  const messages = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  return NextResponse.json({ error: 'バリデーションエラー', details: messages }, { status: 400 });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (error instanceof Error) {
    console.error('API Error:', error.message);
    if (error.name === 'PrismaClientValidationError' || error.message.includes('Invalid `prisma')) {
      const brief = error.message.split('\n').slice(0, 6).join(' ').slice(0, 500);
      return NextResponse.json(
        { error: 'データ形式エラー', details: brief || error.message },
        { status: 400 }
      );
    }
    if (error.message.includes('Unknown argument') || error.message.includes('Unknown field')) {
      return NextResponse.json(
        {
          error: 'サーバーとDBの同期が必要です。`npx prisma generate` と dev サーバー再起動、または Docker 再ビルドを実行してください。',
          details: error.message.slice(0, 300),
        },
        { status: 500 }
      );
    }
    if (error.message.includes('Unique constraint')) {
      return errorResponse('このデータは既に存在します', 409);
    }
    if (error.message.includes('Foreign key constraint')) {
      return errorResponse('関連データが見つかりません', 400);
    }
  }
  console.error('API Error:', error);
  return errorResponse('サーバーエラーが発生しました');
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildMeta(total: number, page: number, limit: number): ApiMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
