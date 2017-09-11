import {PersistentJobClient} from '../src/persistentJobClient'
import AsyncStorage from './asyncStorage'
import {JobStorageStateManager} from './jobStorageState'
import uuid from 'uuid'

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
	id: uuid.v4(),
	jobType,
	args,
	timestamp: Date.now()
})

const sleep = time => new Promise(res => setTimeout(() => res(), time))
const immediately = () => new Promise(res => setImmediate(() => res()))

const assertFalse = () => setTimeout(() => expect(true).toBeFalsy, 10)

describe('Jobs run correctly', () => {

	const storeName = 'store'

	it ('On load several done jobs should be deleted', async () => {
		const stateManager = JobStorageStateManager(storeName)
		const SpyJob = Job(SPY_JOB)

		const shouldNotBeCalled = createCallMe()
		for (let i = 1; i <= 6; i++) {
			stateManager.simulateAddJob(SpyJob(shouldNotBeCalled))
			stateManager.simulateJobFinish(i)
		}

		const client = await PersistentJobClient(
			storeName, 
			[{jobType: SPY_JOB, handleFunction: spy}],
			AsyncStorage(stateManager.state)
		)

		await sleep(1)

		expect(shouldNotBeCalled.isCalled()).toBeFalsy()
		expect(stateManager.state['@react-native-persisted-job:store:currentSerialNumber']).toBe(0)

		for (let i = 1; i <= 6; i++) {
			expect(stateManager.state[`@react-native-persisted-job:store:${i}`]).toBe(undefined)
		}
	})

	it('On load done jobs should be deleted, in progress jobs should run', async () => {
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
			AsyncStorage(stateManager.state)
		)

		await sleep(1)

		expect(shouldBeCalled.isCalled()).toBeTruthy()
		expect(shouldNotBeCalled.isCalled()).toBeFalsy()
	})

	it('New jobs should run', async () => {
		const SpyJob = Job(SPY_JOB)

		const shouldBeCalled = createCallMe()

		const client = await PersistentJobClient(
			storeName, 
			[{jobType: SPY_JOB, handleFunction: spy}],
			AsyncStorage(EMPTY_STATE)
		)

		client.createJob(SPY_JOB)(shouldBeCalled)

		await sleep(1)
		
		expect(shouldBeCalled.isCalled()).toBeTruthy()
	})

	it('stateful jobs run correctly after failure', async () => {
		const spy = jest.fn()
		const runAndFail = (currentState, updateState) => async () => {
			const curr = currentState || 0
			spy(curr)
			if (curr < 10) {
				await updateState(curr + 1)
		
				throw 'I failed'
			}
		}

		const asyncStorage = AsyncStorage(EMPTY_STATE)
		const client = await PersistentJobClient(
				storeName, 
				[{jobType: 'runAndFail', handleFunction: runAndFail, isStateful: true}],
				asyncStorage,
				null,
				subject => subject.filter(x => false)
			)	
			
		client.createJob('runAndFail')()

		for (let i = 1; i < 10; i++) {

			/* sleep 10 to wait until update state is finished before 
			  restarting the PersistentJobClient because of a race condition that won't happen in real applications	*/
			await sleep(10)
			await PersistentJobClient(
				storeName, 
				[{jobType: 'runAndFail', handleFunction: runAndFail, isStateful: true}],
				asyncStorage,
				null,

				// shut down the retry stream
				subject => subject.filter(x => false)
			)	

			expect(spy.mock.calls[i][0]).toBe(i)
		}
	})
})