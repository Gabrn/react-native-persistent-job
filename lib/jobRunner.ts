import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './JobTypes'
import {JobPersisterType} from './jobPersistence'

export type JobRunnerType = {
	runJob: (jobType: string, ...args: Array<any>) => void
}

export function JobRunner (
	jobHandlersMap: Map<string, JobHandler>, 
	jobPersister: JobPersisterType, initialJobs?: Array<JobNumbered>, 
	modifyJobSubject?: (jobSubject: Subject<JobNumbered>) => Subject<JobNumbered>,
	modifyRetrySubject?: (retrySubject: Subject<JobNumbered>) => Subject<JobNumbered> 
) {
	const jobSubject = new Subject<JobNumbered>()
	const job$ = modifyJobSubject ? modifyJobSubject(jobSubject) : jobSubject
	const retrySubject = new Subject<JobNumbered>()
	const retry$ = modifyRetrySubject ? modifyRetrySubject(retrySubject) : retrySubject

	const addJob = (job: JobNumbered) => jobSubject.next(job)
	const addRetry = (job: JobNumbered) => retrySubject.next(job)

	async function jobObserver(job: JobNumbered) {
		const jobHandler = jobHandlersMap.get(job.jobType)
		
		try {
			await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)
		} catch (e) {
			addRetry(job)
		}
	}

	Observable.concat(Observable.from(initialJobs), job$).subscribe(jobObserver)
	retry$.subscribe(addJob)

	async function runJob(jobType: string, ...args: Array<any>) {
		if (!jobHandlersMap.has(jobType)) {
			throw `Can not handle a job of type ${jobType} because there is no job handler for it`
		}

		const job: Job = {jobType, args, timestamp: Date.now()}
		const jobNumbered: JobNumbered = await jobPersister.persistJob(job)

		addJob(jobNumbered)
	} 

	return {
		runJob
	}
}