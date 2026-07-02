import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";

export async function POST(request: NextRequest) {
  const response = redirectAfterPost(request, "/");
  clearSession(response);
  return response;
}
