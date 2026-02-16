/** All possible CPU presets (in vCPU units). */
export const CPU_OPTIONS = [
	{ value: "0.25", label: "0.25 vCPU", cores: 0.25 },
	{ value: "0.5", label: "0.5 vCPU", cores: 0.5 },
	{ value: "1", label: "1 vCPU", cores: 1 },
	{ value: "2", label: "2 vCPU", cores: 2 },
	{ value: "4", label: "4 vCPU", cores: 4 },
	{ value: "8", label: "8 vCPU", cores: 8 },
] as const;

/** All possible memory presets. `bytes` is the value in bytes for comparison. */
export const MEMORY_OPTIONS = [
	{ value: "256m", label: "256 MB", bytes: 256 * 1024 * 1024 },
	{ value: "512m", label: "512 MB", bytes: 512 * 1024 * 1024 },
	{ value: "1g", label: "1 GB", bytes: 1024 * 1024 * 1024 },
	{ value: "2g", label: "2 GB", bytes: 2 * 1024 * 1024 * 1024 },
	{ value: "4g", label: "4 GB", bytes: 4 * 1024 * 1024 * 1024 },
	{ value: "8g", label: "8 GB", bytes: 8 * 1024 * 1024 * 1024 },
	{ value: "16g", label: "16 GB", bytes: 16 * 1024 * 1024 * 1024 },
] as const;

/**
 * Filter CPU options to only those the host can provide.
 * @param hostCpuCount — number of logical CPUs on the host
 */
export function getAvailableCpuOptions(hostCpuCount: number) {
	return CPU_OPTIONS.filter((opt) => opt.cores <= hostCpuCount);
}

/**
 * Filter memory options to only those the host can provide.
 * @param hostMemoryBytes — total host memory in bytes
 */
export function getAvailableMemoryOptions(hostMemoryBytes: number) {
	return MEMORY_OPTIONS.filter((opt) => opt.bytes <= hostMemoryBytes);
}
