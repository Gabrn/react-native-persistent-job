import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './JobTypes'
import {JobPersisterType} from './jobPersistence'

export type JobRunnerType = {
	runJob: (jobType: string, ...args: Array<any>) => void
}

export function JobRunner (
	jobHandlersMap: Map<string, JobHandler>, 
	jobPersister: JobPersisterType, initialJobs?: Array<JobNumbered>, 
	modifyJobSubject?: (jobSubject: Subject<JobNumbered>) => Subject<JobNumbered>
) {

	const jobSubject = modifyJobSubject ? modifyJobSubject(new Subject<JobNumbered>()) : new Subject<JobNumbered>()
	const addJob = (job: JobNumbered) => jobSubject.next(job)

	async function jobObserver(job: JobNumbered) {
		const jobHandler = jobHandlersMap.get(job.jobType)
		
		try {
			await jobHandler.handleFunction(...job.args)
			await jobPersister.clearPersistedJob(job)
		} catch (e) {
			addJob(job)
		}
	}

	Observable.concat(Observable.from(initialJobs), jobSubject).subscribe(jobObserver)

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