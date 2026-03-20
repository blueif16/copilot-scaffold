import { NextRequest, NextResponse } from "next/server";

const BASE = "https://worldmonitor.app";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = new URL(`/${path.join("/")}`, BASE);
  url.search = req.nextUrl.search;

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
