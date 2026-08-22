import type { PaginationMeta } from "@/src/types/api";

export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

const toInt = (raw: string | null, fallback: number) => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Valores fuera de rango se recortan en vez de fallar (AGENTS.md §4). */
export function readPagination(params: URLSearchParams): Pagination {
  const page = Math.max(1, toInt(params.get("page"), 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(params.get("limit"), DEFAULT_LIMIT)));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildMeta(total: number, { page, limit }: Pagination): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages };
}
