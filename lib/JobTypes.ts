export type Job = {
	jobType: string,
	args: Array<any>,
	timestamp: number
}

export type JobNumbered = Job & {
	serialNumber: number
}

export type JobHandler = {
	jobType: string,
	handleFunction: (...args) => Promise<void>
}