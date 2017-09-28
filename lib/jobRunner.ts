import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './jobTypes'
import {JobPersisterType} from './jobPersistence'
import {JobSubscriptions, JobSubscription, RemoveSubscription} from './jobSubscriptions'
import {JOB_DONE, JOB_FAILED, JOB_INTERMEDIATE, JOB_STARTED, JOB_NOT_FOUND} from './jobConstants'
import * as uuid from 'uuid'

export type JobRunnerType = {
	createJob: (jobType: string, topic?: string) => (...args: Array<any>) => Promise<void>,
	subscribe: (jobId: string, subscription: JobSubscription) => RemoveSubscription,
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

	const addJob = (job: JobNumbered) => jobSubject.next(job)
	const addRetry = (job: JobNumbered) => retrySubject.next(job)

	async function jobObserver(job: JobNumbered) {
		const jobHandler = jobHandlersMap.get(job.jobType)
		
		if (!jobHandler) throw `Tried to invoke job of type ${job.jobType} which does not exist`;

		const updateState = async (state: any) => {
			job.state = state
			await jobPersister.updateJob(job)

			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: JOB_INTERMEDIATE, value: job.state})
		}

		try {
			jobHandler.isStateful 
				? await jobHandler.handleFunction(job.state, updateState)(...job.args)
				: await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)

			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: JOB_DONE})
			if (job.topic) jobSubscriptions.removeSubscriptions(job.topic)
		} catch (e) {
			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: JOB_FAILED})
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
	retry$.subscribe(job => addJob({...job, id: uuid.v4()}))

	// public
	const createJob = (jobType: string, topic?: string) => async (...args: Array<any>) => {
		if (!jobHandlersMap.has(jobType)) {
			throw `Can not handle a job of type ${jobType} because there is no job handler for it`
		}

		const job: Job = {jobType, args, timestamp: Date.now(), id: uuid.v4(), topic}
		const jobNumbered: JobNumbered = await jobPersister.persistNewJob(job)
		addJob(jobNumbered)
	} 

	// public
	function subscribe(topic: string, subscription: JobSubscription) {
		const removeSubscription = jobSubscriptions.addSubscription(topic, subscription)
		
		const cachedJob = jobPersister.getCachedJob(topic)

		if (cachedJob) {
			if (cachedJob.state) {
				subscription({jobState: JOB_INTERMEDIATE, value: cachedJob.state})
			} else {
				subscription({jobState: JOB_STARTED})
			}
		} else {
			subscription({jobState: JOB_NOT_FOUND})
		}
		
		return removeSubscription
	}

	return {
		createJob,
		subscribe,
	}
}