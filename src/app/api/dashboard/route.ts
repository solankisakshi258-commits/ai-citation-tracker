import { ok, handleError } from "@/lib/api";
import { getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/dashboard — headline stats + recent activity.
export async function GET() {
  try {
    const stats = await getDashboardStats();
    return ok(stats);
  } catch (error) {
    return handleError(error, "GET /api/dashboard");
  }
}
