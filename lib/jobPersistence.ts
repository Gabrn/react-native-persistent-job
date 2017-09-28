import {Job, JobNumbered} from './jobTypes'

type PersistedJob = JobNumbered & {
	isDone: boolean
}

const prefix = "@react-native-persisted-job"

export type AsyncStorage = {
	setItem: (key: string, item: any) => Promise<void>,
	getItem: (key: string) => Promise<any>,
	removeItem: (key: string) => Promise<void>,
	multiRemove: (key: Array<string>) => Promise<void>,
	multiSet: <T>(pairs: Array<{key: string, value: T}>) => Promise<void>
}

export type JobPersisterType = {
	persistNewJob: (job: Job) => Promise<JobNumbered>,
	updateJob: (job: JobNumbered) => Promise<void>,
	clearPersistedJob: (job: JobNumbered) => Promise<void>,
	fetchAllPersistedJobs: () => Promise<Array<PersistedJob>>,
	clearDoneJobsFromStore: () => Promise<void>,
	getCachedJob: (key: string) => JobNumbered,
}

export async function JobPersister (
	storeName: string,
	asyncStorage: AsyncStorage
): Promise<JobPersisterType> {
	const jobCache: {[topic: string]: JobNumbered} = {}
	const serialNumberKey = `${prefix}:${storeName}:currentSerialNumber`
  let currentSerialNumber = await asyncStorage.getItem(serialNumberKey) || 0
	const stripPersistentFields = (job: JobNumbered) => ({
		id: job.id,
		args: job.args, 
		jobType: job.jobType, 
		serialNumber: job.serialNumber, 
		timestamp: job.timestamp,
		state: job.state
	})
	const getJobKey = (serialNumber: number) => `${prefix}:${storeName}:${serialNumber}`

	// public 
	async function persistNewJob(job: Job): Promise<JobNumbered> {
		currentSerialNumber++
		const jobNumbered: JobNumbered = {...job, serialNumber: currentSerialNumber}

		await asyncStorage.setItem(serialNumberKey, currentSerialNumber)
		await asyncStorage.setItem(getJobKey(currentSerialNumber), {...stripPersistentFields(jobNumbered), isDone: false})
		if (job.topic) jobCache[job.topic] = jobNumbered

		return jobNumbered
	}

	// public
	async function updateJob(job: JobNumbered): Promise<void> {
		await asyncStorage.setItem(getJobKey(currentSerialNumber), {...stripPersistentFields(job), isDone: false})
		if (job.topic) jobCache[job.topic] = {...stripPersistentFields(job)}
	}

	// public
	async function clearPersistedJob(job: JobNumbered): Promise<void> {
		await asyncStorage.setItem(getJobKey(job.serialNumber), {...job, isDone: true})
	}

	// public
	async function fetchAllPersistedJobs(): Promise<Array<PersistedJob>> {
		const persistedJobs: Array<PersistedJob> = []

		for (let i = 1; i <= currentSerialNumber; i++) {
			persistedJobs.push(await asyncStorage.getItem(getJobKey(i)))
		}

		return persistedJobs
	}

	// public
	async function clearDoneJobsFromStore(): Promise<void> {
		const allJobs = await fetchAllPersistedJobs()
		const jobsInProgress: Array<PersistedJob> = allJobs.filter(job => job && !job.isDone).map((job, i) => ({...job, serialNumber: i+1}))

		jobsInProgress.forEach(job => {
			const {isDone, ...jobNumbered} = job
			if (job.topic) jobCache[job.topic] = jobNumbered
		})
		
		const itemsToRemove: Array<string> = []
		for (let i = jobsInProgress.length + 1; i <= currentSerialNumber; i++) {
			itemsToRemove.push(getJobKey(i))
		}

		const itemsToUpdate = jobsInProgress.map(job => ({key: getJobKey(job.serialNumber), value: job}))
		currentSerialNumber = jobsInProgress.length

		await Promise.all([
			asyncStorage.multiSet(itemsToUpdate),
			asyncStorage.multiRemove(itemsToRemove),
			asyncStorage.setItem(serialNumberKey, currentSerialNumber)
		])
	}

	//public
	function getCachedJob(topic: string): JobNumbered {
		return jobCache[topic]
	} 

	return {
		persistNewJob,
		updateJob,
		clearPersistedJob,
		fetchAllPersistedJobs,
		clearDoneJobsFromStore,
		getCachedJob,
	}
}