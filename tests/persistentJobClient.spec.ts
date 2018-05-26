import 'babel-polyfill';
import {PersistentJobClient} from '../src/persistentJobClient'
import noRetries from '../src/streamModifiers/retryStream/noRetries'
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

const storeName = 'store'

describe('Jobs run correctly', () => {
	it ('On load several done jobs should be deleted', async () => {
		const stateManager = JobStorageStateManager(storeName)
		const SpyJob = Job(SPY_JOB)

		const shouldNotBeCalled = createCallMe()
		for (let i = 1; i <= 6; i++) {
			stateManager.simulateAddJob(SpyJob(shouldNotBeCalled))
			stateManager.simulateJobFinish(i)
		}

		await PersistentJobClient(
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

		await PersistentJobClient(
			storeName, 
			[{jobType: SPY_JOB, handleFunction: spy}],
			AsyncStorage(stateManager.state)
		)

		await sleep(1)

		expect(shouldBeCalled.isCalled()).toBeTruthy()
		expect(shouldNotBeCalled.isCalled()).toBeFalsy()
	})

	it('New jobs should run', async () => {
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
				undefined,
				subject => subject.filter(() => false)
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
				undefined,

				// shut down the retry stream
				subject => subject.filter(() => false)
			)	

			expect(spy.mock.calls[i][0]).toBe(i)
		}
	})

	it('When running several jobs without concurrency limit jobs run concurrently', async () => {
		const spy = jest.fn()
		const asyncStorage = AsyncStorage(EMPTY_STATE)
		const runAndSleep = async () => {
			spy(1)
			await sleep(20)
		}

		const client = await PersistentJobClient(
			'When running several jobs without concurrency limit jobs run concurrently',
			[{jobType: 'runAndSleep', handleFunction: runAndSleep}],
			asyncStorage,
		)

		const CALL_NUMBER = 100
		const persistentRunAndSleep = client.createJob('runAndSleep')
		for (let i = 0; i < CALL_NUMBER; i++) {
			persistentRunAndSleep()
		}

		// Let all jobs run concurrently
		await sleep(100)

		expect(spy.mock.calls.length).toBe(CALL_NUMBER)
	})

	it('When running several jobs and concurrency limit is set to 1, run one job at a time', async () => {
		const spy = jest.fn()
		const asyncStorage = AsyncStorage(EMPTY_STATE)
		const runAndSleep = async () => {
			spy(1)
			await sleep(20)
		}

		const client = await PersistentJobClient(
			'When running several jobs and concurrency limit is on jobs run do not run concurrently',
			[{jobType: 'runAndSleep', handleFunction: runAndSleep}],
			asyncStorage,
			undefined,
			undefined,
			1
		)

		const CALL_NUMBER = 100
		const WAIT_TIME = 100
		const persistentRunAndSleep = client.createJob('runAndSleep')
		for (let i = 0; i < CALL_NUMBER; i++) {
			persistentRunAndSleep()
		}

		// Let some jobs run
		await sleep(WAIT_TIME)

		expect(spy.mock.calls.length).toBeLessThan(WAIT_TIME / 10)
	})

	it('When running several jobs and concurrency limit is set to 2, run two jobs at a time', async () => {
		const spy = jest.fn()
		const asyncStorage = AsyncStorage(EMPTY_STATE)
		const runAndSleep = async () => {
			spy(1)
			await sleep(20)
		}

		const client = await PersistentJobClient(
			'When running several jobs and concurrency limit is set to 2, run two jobs at a time',
			[{jobType: 'runAndSleep', handleFunction: runAndSleep}],
			asyncStorage,
			undefined,
			undefined,
			2
		)

		const CALL_NUMBER = 100
		const WAIT_TIME = 100
		const persistentRunAndSleep = client.createJob('runAndSleep')
		for (let i = 0; i < CALL_NUMBER; i++) {
			persistentRunAndSleep()
		}

		// Let some jobs run
		await sleep(WAIT_TIME)

		expect(spy.mock.calls.length).toBeGreaterThanOrEqual(WAIT_TIME / 10)
		expect(spy.mock.calls.length).toBeLessThan(WAIT_TIME * 2 / 10)
	})
})

describe("No race conditions on job writes",() => {
	const SlowAsyncStorage = (state) => {
		const innerAsyncStorage = AsyncStorage(state)

		const setItem = async (key, item) => {
			await sleep(20)
			await innerAsyncStorage.setItem(key, item)
		}

		return {
			...innerAsyncStorage,
			setItem,
		}
	}
	it("When writing multiple jobs to async storage they don't override eachother", async () => {
		const trackedStorageState = {}

		const client = await PersistentJobClient(
			"someStore", 
			[{jobType: 'nullFunction', handleFunction: ()=>{throw 'noGood'}}],
			SlowAsyncStorage(trackedStorageState),
			undefined, noRetries
		)

		await Promise.all([client.createJob('nullFunction')(), client.createJob('nullFunction')()])
		
		await sleep(60)

		expect(trackedStorageState['@react-native-persisted-job:someStore:currentSerialNumber']).toBe(2)
		expect(trackedStorageState['@react-native-persisted-job:someStore:1']).toBeDefined()
		expect(trackedStorageState['@react-native-persisted-job:someStore:2']).toBeDefined()
	})
})
describe("job subscriptions work correctly", () => {
	it("When a subscriber subscribes to a job it sees when the job starts and when it ends", async () => {
		const spy = jest.fn()

		const client = await PersistentJobClient(
			"When a subscriber subscribes to a job it sees when the job starts and when it ends", 
			[{jobType: 'sleep', handleFunction: () => sleep(10)}],
			AsyncStorage(EMPTY_STATE)
		)

		const SOME_TOPIC = 'SOME_TOPIC'
		await client.createJob('sleep', SOME_TOPIC)()
		client.subscribe(SOME_TOPIC, (state) => spy(state))

		await sleep(20)
		expect(spy.mock.calls[0][0].jobState).toBe('JOB_STARTED')
		expect(spy.mock.calls[1][0].jobState).toBe('JOB_DONE')
	})

	it("Stateful jobs should show intermediate state to subscribers", async () => {
		const spy = jest.fn()

		const statefulFunction = (_, updateState) => async () => {
			for (let i = 0; i < 10; i++) {
				await updateState('state' + i)
				await sleep(10)
			}
		}

		const client = await PersistentJobClient(
			"Stateful jobs should show intermediate state to subscribers", 
			[{jobType: 'something', handleFunction: statefulFunction, isStateful: true}],
			AsyncStorage(EMPTY_STATE)
		)

		const SOME_TOPIC = 'SOME_TOPIC'
		client.createJob('something', SOME_TOPIC)()
		client.subscribe(SOME_TOPIC, (state) => spy(state))

		await sleep(150)
		expect(spy.mock.calls[0][0].jobState).toBe('JOB_STARTED')
		for (let i = 1; i < 11; i++) {
			const {jobState, value} = spy.mock.calls[i][0]
			expect(jobState).toBe('JOB_INTERMEDIATE')
			expect(value).toBe('state' + (i - 1))
		}
		expect(spy.mock.calls[11][0].jobState).toBe('JOB_DONE')
	})

	it("When running several subscribers, each subscriber should be notified", async () => {
		const spy = jest.fn()
		const spy2 = jest.fn()
		const spy3 = jest.fn()
		const client = await PersistentJobClient(
			"When running several subscribers, each subscriber should be notified", 
			[{jobType: 'sleep', handleFunction: () => sleep(10)}],
			AsyncStorage(EMPTY_STATE)
		)

		const SOME_TOPIC = 'SOME_TOPIC'
		await client.createJob('sleep', SOME_TOPIC)()
		client.subscribe(SOME_TOPIC, (state) => spy(state))
		client.subscribe(SOME_TOPIC, (state) => spy2(state))
		client.subscribe(SOME_TOPIC, (state) => spy3(state))
		
		await sleep(30)
		expect(spy.mock.calls[0][0].jobState).toBe('JOB_STARTED')
		expect(spy.mock.calls[1][0].jobState).toBe('JOB_DONE')
		expect(spy2.mock.calls[0][0].jobState).toBe('JOB_STARTED')
		expect(spy2.mock.calls[1][0].jobState).toBe('JOB_DONE')
		expect(spy3.mock.calls[0][0].jobState).toBe('JOB_STARTED')
		expect(spy3.mock.calls[1][0].jobState).toBe('JOB_DONE')
	})
})