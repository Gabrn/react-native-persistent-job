export type Job = {
	jobType: string,
	args: any[],
	timestamp: number,
	id: string,
	state?: any,
	topic?: string,
}

export type JobNumbered = Job & {
	serialNumber: number,
}

type UpdateState = (state: any) => Promise<void> 
type HandleFunctionStateful = (currentState: any, updateState: UpdateState) => (...args: any[]) => Promise<void>
type HandleFuncitonStateless = (...args: any[]) => Promise<void>

type JobHandlerStateful = {
	isStateful: true,
	jobType: string,
	handleFunction: HandleFunctionStateful,
}

type JobHandlerStateless = {
	isStateful?: false,
	jobType: string,
	handleFunction: HandleFuncitonStateless,
}

export type JobHandler = JobHandlerStateful | JobHandlerStateless