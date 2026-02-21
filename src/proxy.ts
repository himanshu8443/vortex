import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "forgot-password"];

export function proxy(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith("/old-route")) {
		return NextResponse.redirect(new URL("/new-route", request.url));
	}

	const sessionToken = request.cookies.get("better-auth.session_token");
	const isPublic = PUBLIC_PATHS.some((path) =>
		request.nextUrl.pathname.startsWith(path),
	);
	if (!sessionToken && !isPublic) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	if (sessionToken && isPublic) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
