export type Job = {
	jobType: string,
	args: any[],
	timestamp: number,
	id: string,
	state?: any,
	topic?: string,
	terminated?: boolean,
	extraPersistentData?: {},
}

export type JobNumbered = Job & {
	serialNumber: number,
}

type UpdateState = (state: any) => Promise<void> 
export type HandleFunctionStateful = (currentState: any, updateState: UpdateState) => (...args: any[]) => Promise<void>
export type HandleFuncitonStateless = (...args: any[]) => Promise<void>

export type JobHandlerStateful = {
	isStateful: true,
	jobType: string,
	handleFunction: HandleFunctionStateful,
}

export type JobHandlerStateless = {
	isStateful?: false,
	jobType: string,
	handleFunction: HandleFuncitonStateless,
}

export type JobHandler = JobHandlerStateful | JobHandlerStateless