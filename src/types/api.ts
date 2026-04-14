export interface ApiOk<T> { ok: true; data: T }
export interface ApiErr { ok: false; error: string }
export type ApiResponse<T> = ApiOk<T> | ApiErr;
