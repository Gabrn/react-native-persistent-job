import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './jobTypes'
import {JobPersisterType} from './jobPersistence'
import {JobSubscriptions, JobSubscription, RemoveSubscription} from './jobSubscriptions'
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
	const job$ = Observable
		.concat(Observable.from(initialJobs || []), jobSubject.asObservable())
		.do(job => job.topic && jobSubscriptions.addTopic(job.topic, job))
	const modifiedJob$ = modifyJobSubject? modifyJobSubject(job$) : job$
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

			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: 'JOB_INTERMEDIATE', value: job.state})
		}

		try {
			const value = jobHandler.isStateful 
				? await jobHandler.handleFunction(job.state, updateState)(...job.args)
				: await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)

			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: 'JOB_DONE', value})
			if (job.topic) jobSubscriptions.removeTopic(job.topic)
		} catch (e) {
			if (job.topic) jobSubscriptions.notifySubscriptions(job.topic, {jobState: 'JOB_FAILED', value: e})
			addRetry(job)
		}
	}

	modifiedJob$
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
		if (topic) {
			jobSubscriptions.addTopic(topic, job)
		}
		
		const jobNumbered: JobNumbered = await jobPersister.persistNewJob(job)
		addJob(jobNumbered)
	} 

	return {
		createJob,
		subscribe: jobSubscriptions.addSubscription,
	}
}