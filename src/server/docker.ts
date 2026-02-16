import Docker from "dockerode";

const globalForDocker = globalThis as unknown as { docker: Docker | undefined };

export const docker =
	globalForDocker.docker ?? new Docker({ socketPath: "/var/run/docker.sock" });

if (process.env.NODE_ENV !== "production") globalForDocker.docker = docker;
