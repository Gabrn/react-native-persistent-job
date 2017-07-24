import {Subject, Observable} from 'rxjs'
import {Job, JobNumbered, JobHandler} from './JobTypes'
import {JobRunner} from './jobRunner'
import {JobPersister, AsyncStorage} from './jobPersistence'

type Params = {
	storeName: string, 
	jobHandlers: Array<JobHandler>, 
	asyncStorage: AsyncStorage,
	modifyJobSubject?: (jobSubject: Subject<JobNumbered>) => Subject<JobNumbered>,
}

export async function PersistentJobClient (
	storeName: string, 
	jobHandlers: Array<JobHandler>, 
	asyncStorage: AsyncStorage,
	modifyJobSubject?: (jobSubject: Subject<JobNumbered>) => Subject<JobNumbered>,
) {
	const jobPersister = await JobPersister(storeName, asyncStorage)
	const jobHandlersMap = new Map<string, JobHandler>()
	jobHandlers.forEach(jobHandler => jobHandlersMap.set(jobHandler.jobType, jobHandler))
	await jobPersister.clearDoneJobsFromStore()
	const persistedJobs = await jobPersister.fetchAllPersistedJobs()
	const jobRunner = JobRunner(jobHandlersMap, jobPersister, persistedJobs, modifyJobSubject)

	return {
		runJob: jobRunner.runJob
	}
}

