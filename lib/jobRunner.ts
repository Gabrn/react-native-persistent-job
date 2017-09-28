import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './jobTypes'
import {JobPersisterType} from './jobPersistence'
import {JobSubscriptions, JobSubscription, RemoveSubscription} from './jobSubscriptions'
import {JOB_DONE, JOB_FAILED, JOB_INTERMEDIATE} from './jobConstants'
import * as uuid from 'uuid'

export type JobRunnerType = {
	createJob: (jobType: string) => (...args: Array<any>) => Promise<void>,
	addSubscription: (jobId: string, subscription: JobSubscription) => RemoveSubscription,
}

export function JobRunner (
	jobHandlersMap: Map<string, JobHandler>, 
	jobPersister: JobPersisterType, 
	initialJobs?: Array<JobNumbered>, 
	modifyJobSubject?: (jobSubject: Observable<JobNumbered>) => Observable<JobNumbered>,
	modifyRetrySubject?: (retrySubject: Observable<JobNumbered>) => Observable<JobNumbered>,
	limitConccurency?: number,
) {
	const jobSubject = new Subject<JobNumbered>()
	const job$ = modifyJobSubject ? modifyJobSubject(jobSubject.asObservable()) : jobSubject.asObservable()
	const retrySubject = new Subject<JobNumbered>()
	const retry$ = modifyRetrySubject ? modifyRetrySubject(retrySubject.asObservable()) : retrySubject.asObservable()
	const jobSubscriptions = JobSubscriptions()

	const addJob = (job: JobNumbered) => jobSubject.next({...job, id: uuid.v4()})
	const addRetry = (job: JobNumbered) => retrySubject.next(job)

	async function jobObserver(job: JobNumbered) {
		const jobHandler = jobHandlersMap.get(job.jobType)
		
		if (!jobHandler) throw `Tried to invoke job of type ${job.jobType} which does not exist`;

		const updateState = async (state: any) => {
			job.state = state
			await jobPersister.updateJob(job)

			jobSubscriptions.runSubscriptions(job.id, {jobState: JOB_INTERMEDIATE, value: job.state})
		}

		try {
			jobHandler.isStateful 
				? await jobHandler.handleFunction(job.state, updateState)(...job.args)
				: await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)

			jobSubscriptions.runSubscriptions(job.id, {jobState: JOB_DONE})
			jobSubscriptions.removeSubscriptions(job.id)
		} catch (e) {
			jobSubscriptions.runSubscriptions(job.id, {jobState: JOB_FAILED})
			addRetry(job)
		}
	}

	Observable
		.concat(Observable.from(initialJobs || []), job$)
		.flatMap(
			job => Observable.fromPromise(jobObserver(job)),
			limitConccurency
		)
		.subscribe()
	retry$.subscribe(addJob)

	// public
	const createJob = (jobType: string) => async (...args: Array<any>) => {
		if (!jobHandlersMap.has(jobType)) {
			throw `Can not handle a job of type ${jobType} because there is no job handler for it`
		}

		const job: Job = {jobType, args, timestamp: Date.now(), id: uuid.v4()}
		const jobNumbered: JobNumbered = await jobPersister.persistNewJob(job)

		addJob(jobNumbered)
	} 

	return {
		createJob,
		addSubscription: jobSubscriptions.addSubscription,
	}
}