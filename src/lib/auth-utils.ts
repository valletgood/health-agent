import "server-only";
import { createSupabaseServer } from "@/lib/supabase-server";

/**
 * API 라우트에서 사용자 식별자를 반환한다.
 * 1순위: Supabase Auth user.id (로그인 상태)
 * 2순위: X-Device-Id 헤더 (익명 사용)
 * 둘 다 없으면 null
 */
export async function resolveUserId(request?: Request): Promise<string | null> {
    // Supabase Auth 확인
    const supabase = await createSupabaseServer();
    if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) return user.id;
    }

    // 폴백: X-Device-Id 헤더
    if (request) {
        const deviceId = request.headers.get("X-Device-Id");
        if (deviceId) return deviceId;
    }

    return null;
}
