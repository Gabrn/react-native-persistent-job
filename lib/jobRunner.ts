import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './jobTypes'
import {JobPersisterType} from './jobPersistence'
import * as uuid from 'uuid'

export type JobRunnerType = {
	runJob: (jobType: string, ...args: Array<any>) => void
}

export function JobRunner (
	jobHandlersMap: Map<string, JobHandler>, 
	jobPersister: JobPersisterType, initialJobs?: Array<JobNumbered>, 
	modifyJobSubject?: (jobSubject: Observable<JobNumbered>) => Observable<JobNumbered>,
	modifyRetrySubject?: (retrySubject: Observable<JobNumbered>) => Observable<JobNumbered> 
) {
	const jobSubject = new Subject<JobNumbered>()
	const job$ = modifyJobSubject ? modifyJobSubject(jobSubject.asObservable()) : jobSubject.asObservable()
	const retrySubject = new Subject<JobNumbered>()
	const retry$ = modifyRetrySubject ? modifyRetrySubject(retrySubject.asObservable()) : retrySubject.asObservable()
	const addJob = (job: JobNumbered) => jobSubject.next({...job, id: uuid.v4()})
	const addRetry = (job: JobNumbered) => retrySubject.next(job)

	async function jobObserver(job: JobNumbered) {
		const jobHandler = jobHandlersMap.get(job.jobType)
		
		if (!jobHandler) throw `Tried to invoke job of type ${job.jobType} which does not exist`;

		const updateState = async (state: any) => {
			job.state = state
			await jobPersister.updateJob(job)
		}
		
		try {
			jobHandler.isStateful 
				? await jobHandler.handleFunction(job.state, updateState)(...job.args)
				: await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)
		} catch (e) {
			addRetry(job)
		}
	}

	Observable.concat(Observable.from(initialJobs || []), job$).subscribe(jobObserver)
	retry$.subscribe(addJob)

	// public
	async function runJob(jobType: string, ...args: Array<any>) {
		if (!jobHandlersMap.has(jobType)) {
			throw `Can not handle a job of type ${jobType} because there is no job handler for it`
		}

		const job: Job = {jobType, args, timestamp: Date.now(), id: uuid.v4()}
		const jobNumbered: JobNumbered = await jobPersister.persistNewJob(job)

		addJob(jobNumbered)
	} 

	return {
		runJob
	}
}