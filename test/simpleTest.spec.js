import {PersistentJobClient} from '../src/persistentJobClient'
import asyncStorage from './asyncStorage'
import {JobStorageStateManager} from './jobStorageState'

const spy = async (callMe) => {
	callMe.call()
}

const createCallMe = () => {
	let isCalled = {value: false}
	const call = () => isCalled.value = true

	return {
		isCalled: () => isCalled.value,
		call
	}
}

const Job = (jobType) => (...args) => ({
	jobType,
	args,
	timestamp: Date.now()
})

const sleep = time => new Promise(res => setTimeout(() => res(), time))


const assertFalse = () => setTimeout(() => expect(true).toBeFalsy, 10)

describe('Job run after restart', () => {
	it('Done jobs should be deleted, in progress jobs should run', async () => {
		const storeName = 'store'
		const stateManager = JobStorageStateManager(storeName)
		const SpyJob = Job('SpyJob')

		const shouldBeCalled = createCallMe()
		const shouldNotBeCalled = createCallMe()
		stateManager.simulateAddJob(SpyJob(shouldBeCalled))
		stateManager.simulateAddJob(SpyJob(shouldNotBeCalled))
		stateManager.simulateJobFinish(2)

		const client = await PersistentJobClient(
			storeName, 
			[{jobType: 'SpyJob', handleFunction: spy}],
			asyncStorage(stateManager.state)
		)

		await sleep(100)

		expect(shouldBeCalled.isCalled()).toBeTruthy()
		expect(shouldNotBeCalled.isCalled()).toBeFalsy()
	})
})