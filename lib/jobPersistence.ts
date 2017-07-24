import {Job, JobNumbered} from './JobTypes'

type PersistedJob = JobNumbered & {
	isDone: boolean
}

const prefix = "@react-native-persisted-job"

export type AsyncStorage = {
	setItem: (key: string, item: any) => Promise<void>,
	getItem: (key: string) => Promise<any>
}

export type JobPersisterType = {
	persistJob: (job: Job) => Promise<JobNumbered>,
	clearPersistedJob: (job: JobNumbered) => Promise<void>,
	fetchAllPersistedJobs: () => Promise<Array<PersistedJob>>,
	clearDoneJobsFromStore: () => Promise<void>
}

export async function JobPersister (
	storeName: string,
	asyncStorage: AsyncStorage
): Promise<JobPersisterType> {

	const serialNumberKey = `${prefix}:${storeName}:currentSerialNumber`
	let currentSerialNumber: number = await asyncStorage.getItem(serialNumberKey) || 0

	function getJobKey(serialNumber: number) {
		return `${prefix}:${storeName}:${serialNumber}`
	} 

	async function persistJob(job: Job): Promise<JobNumbered> {
		currentSerialNumber++
		const jobNumbered: JobNumbered = {...job, serialNumber: currentSerialNumber}

		await asyncStorage.setItem(serialNumberKey, currentSerialNumber)
		await asyncStorage.setItem(getJobKey(currentSerialNumber), {...jobNumbered, isDone: false})

		return jobNumbered
	}

	async function clearPersistedJob(job: JobNumbered): Promise<void> {
		await asyncStorage.setItem(getJobKey(job.serialNumber), {...job, isDone: true})
	}

	async function fetchAllPersistedJobs(): Promise<Array<PersistedJob>> {
		const persistedJobs: Array<PersistedJob> = []

		for (let i = 1; i <= currentSerialNumber; i++) {
			persistedJobs.push(await asyncStorage.getItem(getJobKey(i)))
		}

		return persistedJobs
	}

	async function clearDoneJobsFromStore(): Promise<void> {
		const allJobs = await fetchAllPersistedJobs()
		const jobsInProgress: Array<PersistedJob> = allJobs.filter(job => !job.isDone).map((job, i) => ({...job, serialNumber: i+1}))

		for (let i = jobsInProgress.length + 1; i <= currentSerialNumber; i++) {
			asyncStorage.setItem(getJobKey(i), undefined)
		}

		currentSerialNumber = jobsInProgress.length
		await asyncStorage.setItem(serialNumberKey, currentSerialNumber)

		await Promise.all(
			jobsInProgress.map(job => asyncStorage.setItem(getJobKey(job.serialNumber), job))
		)
	}

	return {
		persistJob,
		clearPersistedJob,
		fetchAllPersistedJobs,
		clearDoneJobsFromStore
	}
}