import {PersistentJobClient} from '../src/persistentJobClient'
import asyncStorage from './asyncStorage'
import {JobStorageStateManager} from './jobStorageState'

const EMPTY_STATE = {}
const SPY_JOB = 'SPY_JOB'
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

describe('Jobs run correctly', () => {
	it('On load done jobs should be deleted, in progress jobs should run', async () => {
		const storeName = 'store'
		const stateManager = JobStorageStateManager(storeName)
		const SpyJob = Job(SPY_JOB)

		const shouldBeCalled = createCallMe()
		const shouldNotBeCalled = createCallMe()
		stateManager.simulateAddJob(SpyJob(shouldBeCalled))
		stateManager.simulateAddJob(SpyJob(shouldNotBeCalled))
		stateManager.simulateJobFinish(2)

		const client = await PersistentJobClient(
			storeName, 
			[{jobType: SPY_JOB, handleFunction: spy}],
			asyncStorage(stateManager.state)
		)

		await sleep(1)

		expect(shouldBeCalled.isCalled()).toBeTruthy()
		expect(shouldNotBeCalled.isCalled()).toBeFalsy()
	})

	it('New jobs should run', async () => {
		const storeName = 'store'
		const SpyJob = Job(SPY_JOB)

		const shouldBeCalled = createCallMe()

		const client = await PersistentJobClient(
			storeName, 
			[{jobType: SPY_JOB, handleFunction: spy}],
			asyncStorage(EMPTY_STATE)
		)

		client.runJob(SPY_JOB, shouldBeCalled)

		await sleep(1)
		
		expect(shouldBeCalled.isCalled()).toBeTruthy()
	})
})