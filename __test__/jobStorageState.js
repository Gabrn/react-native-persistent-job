const prefix = "@react-native-persisted-job"

export const JobStorageStateManager = (storeName) => {
	function getJobKey(serialNumber) {
		return `${prefix}:${storeName}:${serialNumber}`
	} 

	const serialNumberKey = `${prefix}:${storeName}:currentSerialNumber`

	let currentSerialNumber = 0
	const state = {}
	const simulateAddJob = (job) => {
		currentSerialNumber++
		const jobNumbered = {...job, serialNumber: currentSerialNumber}

		state[serialNumberKey] = currentSerialNumber
		state[getJobKey(currentSerialNumber)] = {...jobNumbered, isDone: false}
	}

	const simulateJobFinish = (serialNumber) => {
		state[getJobKey(serialNumber)].isDone = true
	}

	return {
		simulateAddJob,
		simulateJobFinish,
		state
	}
}