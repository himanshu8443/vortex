"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export default function Navbar() {
	const { data: session } = authClient.useSession();
	const router = useRouter();

	return (
		<nav className="sticky top-0 z-50 flex h-16 items-center gap-4 border-border/40 border-b bg-background/60 px-6 backdrop-blur-xl">
			<Link className="flex items-center gap-0 font-bold text-xl" href="/">
				<img alt="Vortex Logo" src="/logo.png" width={35} />

				<span>Vortex</span>
			</Link>
			<div className="ml-auto flex items-center gap-2">
				<ModeToggle />

				{session ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Avatar className="h-9 w-9 cursor-pointer border transition-opacity hover:opacity-80">
								<AvatarImage
									alt={session.user.name}
									src={session.user.image ?? undefined}
								/>
								<AvatarFallback>
									{session.user.name.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>My Account</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link className="cursor-pointer" href="/settings">
									<Settings className="h-4 w-4" />
									Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="cursor-pointer text-destructive focus:text-destructive"
								onClick={async () => {
									await authClient.signOut();
									router.push("/login");
								}}
							>
								<LogOut className="mr-2 h-4 w-4" />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<Button asChild size="sm" variant="ghost">
						<Link href="/login">Login</Link>
					</Button>
				)}
			</div>
		</nav>
	);
}
