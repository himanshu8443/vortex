import {
	defaultShouldDehydrateQuery,
	QueryCache,
	MutationCache,
	QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { authClient } from "@/lib/auth-client";

const handleAuthError = (error: unknown) => {
	if (typeof window === "undefined") return;

	// Check if TRPC returned an UNAUTHORIZED code
	const isUnauthorized =
		(error as any)?.data?.code === "UNAUTHORIZED" ||
		(error as Error)?.message?.toLowerCase().includes("unauthorized");

	if (isUnauthorized) {
		void authClient.signOut().finally(() => {
			if (
				window.location.pathname !== "/login" &&
				window.location.pathname !== "/setup"
			) {
				window.location.href = "/login";
			}
		});
	}
};

export const createQueryClient = () =>
	new QueryClient({
		queryCache: new QueryCache({
			onError: handleAuthError,
		}),
		mutationCache: new MutationCache({
			onError: handleAuthError,
		}),
		defaultOptions: {
			queries: {
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client
				staleTime: 30 * 1000,
			},
			dehydrate: {
				serializeData: SuperJSON.serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
			hydrate: {
				deserializeData: SuperJSON.deserialize,
			},
		},
	});
