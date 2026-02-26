"use client";

import Editor from "@monaco-editor/react";
import { FileCode2, FileUp, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────
export type FileContentType = "dockerfile" | "composefile";

interface FileContentConfig {
	label: string;
	language: string;
	defaultContent: string;
	fileAccept: string;
	fileNames: string[];
}

const FILE_CONTENT_CONFIGS: Record<FileContentType, FileContentConfig> = {
	dockerfile: {
		label: "Dockerfile",
		language: "dockerfile",
		defaultContent: `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`,
		fileAccept: "*",
		fileNames: ["Dockerfile", "dockerfile", "Dockerfile.*"],
	},
	composefile: {
		label: "Compose File",
		language: "yaml",
		defaultContent: `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
`,
		fileAccept: ".yml,.yaml",
		fileNames: [
			"docker-compose.yml",
			"docker-compose.yaml",
			"compose.yml",
			"compose.yaml",
		],
	},
};

// ─── Editor Dialog ──────────────────────────────────
interface FileContentEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileType: FileContentType;
	value: string;
	onSave: (content: string) => void;
}

export function FileContentEditorDialog({
	open,
	onOpenChange,
	fileType,
	value,
	onSave,
}: FileContentEditorDialogProps) {
	const config = FILE_CONTENT_CONFIGS[fileType];
	const [editorContent, setEditorContent] = useState(value);
	const editorRef = useRef<unknown>(null);

	// Sync editor content whenever the dialog opens or value changes
	useEffect(() => {
		if (open) {
			setEditorContent(value || "");
		}
	}, [open, value]);

	const handleSave = () => {
		onSave(editorContent);
		onOpenChange(false);
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden border border-border/50 bg-background/95 p-0 backdrop-blur-xl sm:max-w-4xl"
				showCloseButton={false}
			>
				<DialogHeader className="flex-shrink-0 border-border/50 border-b px-5 pt-4 pb-3">
					<div className="flex items-center justify-between">
						<DialogTitle className="flex items-center gap-2">
							<FileCode2 className="h-5 w-5 text-primary" />
							Edit {config.label}
						</DialogTitle>
						<Button
							className="h-8 w-8 p-0 hover:bg-muted/50"
							onClick={() => onOpenChange(false)}
							size="sm"
							variant="ghost"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-hidden">
					<Editor
						height="100%"
						language={config.language}
						onChange={(val) => setEditorContent(val ?? "")}
						onMount={(editor) => {
							editorRef.current = editor;
						}}
						options={{
							minimap: { enabled: false },
							fontSize: 14,
							lineNumbers: "on",
							wordWrap: "on",
							scrollBeyondLastLine: false,
							automaticLayout: true,
							padding: { top: 12, bottom: 12 },
							renderLineHighlight: "gutter",
							folding: true,
							bracketPairColorization: { enabled: true },
							smoothScrolling: true,
							cursorSmoothCaretAnimation: "on",
							tabSize: 2,
						}}
						theme="vs-dark"
						value={editorContent}
					/>
				</div>

				<DialogFooter className="flex-shrink-0 border-border/50 border-t bg-card/30 px-5 py-3">
					<div className="flex w-full items-center justify-between">
						<span className="text-muted-foreground text-xs">
							{editorContent.split("\n").length} lines
						</span>
						<div className="flex gap-2">
							<Button
								onClick={() => onOpenChange(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
							<Button
								className="shadow-lg shadow-primary/20"
								disabled={!editorContent.trim()}
								onClick={handleSave}
								type="button"
							>
								Save {config.label}
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Source Picker ───────────────────────────────────
// This is the component that replaces the old "path" input.
// It shows two options: "Enter Manually" and "Choose File".
interface FileContentSourcePickerProps {
	fileType: FileContentType;
	content: string;
	onContentChange: (content: string) => void;
}

export function FileContentSourcePicker({
	fileType,
	content,
	onContentChange,
}: FileContentSourcePickerProps) {
	const config = FILE_CONTENT_CONFIGS[fileType];
	const [editorOpen, setEditorOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			if (text) {
				onContentChange(text);
				// Open editor with the loaded content
				setEditorOpen(true);
			}
		};
		reader.readAsText(file);

		// Reset file input so the same file can be re-selected
		e.target.value = "";
	};

	const handleEnterManually = () => {
		setEditorOpen(true);
	};

	const hasContent = !!content.trim();

	return (
		<>
			<div className="space-y-3">
				{!hasContent ? (
					<div className="grid gap-3 md:grid-cols-2">
						{/* Enter Manually */}
						<button
							className={cn(
								"group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border/60 border-dashed bg-card/20 p-5 text-center shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md",
							)}
							onClick={handleEnterManually}
							type="button"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
								<Pencil className="h-5 w-5 text-primary" />
							</div>
							<div className="space-y-0.5">
								<div className="font-medium text-sm transition-colors group-hover:text-primary">
									Enter Manually
								</div>
								<div className="text-muted-foreground text-xs">
									Write your {config.label} in the editor
								</div>
							</div>
							<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-50" />
						</button>

						{/* Choose File */}
						<button
							className={cn(
								"group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border/60 border-dashed bg-card/20 p-5 text-center shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md",
							)}
							onClick={() => fileInputRef.current?.click()}
							type="button"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
								<FileUp className="h-5 w-5 text-primary" />
							</div>
							<div className="space-y-0.5">
								<div className="font-medium text-sm transition-colors group-hover:text-primary">
									Choose File
								</div>
								<div className="text-muted-foreground text-xs">
									Load an existing {config.label}
								</div>
							</div>
							<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-50" />
						</button>
					</div>
				) : (
					/* Content loaded — show preview + actions */
					<div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<FileCode2 className="h-4 w-4 text-primary" />
								<span className="font-medium text-primary text-sm">
									{config.label} configured
								</span>
								<span className="text-muted-foreground text-xs">
									({content.split("\n").length} lines)
								</span>
							</div>
							<div className="flex items-center gap-1">
								<Button
									className="h-7 gap-1 px-2 text-xs hover:bg-primary/10"
									onClick={() => setEditorOpen(true)}
									size="sm"
									type="button"
									variant="ghost"
								>
									<Pencil className="h-3 w-3" />
									Edit
								</Button>
								<Button
									className="h-7 gap-1 px-2 text-xs hover:bg-primary/10"
									onClick={() => fileInputRef.current?.click()}
									size="sm"
									type="button"
									variant="ghost"
								>
									<FileUp className="h-3 w-3" />
									Replace
								</Button>
								<Button
									className="h-7 px-2 text-destructive text-xs hover:bg-destructive/10 hover:text-destructive"
									onClick={() => onContentChange("")}
									size="sm"
									type="button"
									variant="ghost"
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						</div>
						{/* Mini code preview */}
						<div className="max-h-24 overflow-hidden rounded-md bg-background/80 font-mono text-muted-foreground text-xs leading-relaxed">
							<pre className="overflow-hidden p-2">
								{content
									.split("\n")
									.slice(0, 6)
									.map((line, i) => (
										<div
											className="truncate"
											key={`preview-${i}-${line.slice(0, 20)}`}
										>
											<span className="mr-3 inline-block w-4 text-right text-muted-foreground/40">
												{i + 1}
											</span>
											{line}
										</div>
									))}
								{content.split("\n").length > 6 && (
									<div className="text-muted-foreground/40">
										<span className="mr-3 inline-block w-4 text-right">
											...
										</span>
										+{content.split("\n").length - 6} more lines
									</div>
								)}
							</pre>
						</div>
					</div>
				)}
			</div>

			<input
				accept={config.fileAccept}
				className="hidden"
				onChange={handleFileSelect}
				ref={fileInputRef}
				type="file"
			/>

			<FileContentEditorDialog
				fileType={fileType}
				onOpenChange={setEditorOpen}
				onSave={onContentChange}
				open={editorOpen}
				value={content}
			/>
		</>
	);
}
