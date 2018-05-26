import 'babel-polyfill';
import {PersistentJobClient} from '../../src/persistentJobClient'
import AsyncStorage from '../asyncStorage'
import limitJobRuns from '../../src/jobHandlerModifiers/limitJobRuns'

const EMPTY_STATE = {}
const sleep = time => new Promise(res => setTimeout(res, time * 4))

describe('limitJobRuns works correctly', () => {
	it('After all retries are done job should not run', async () => {
		const spy = jest.fn()
		const RUNS_LIMIT = 3
		const handleFunction = async () => {
			await sleep(1)
			spy()
			throw 'bad'
		}

		const client = await PersistentJobClient(
			"After all retries are done job should not run", 
			[
				limitJobRuns(RUNS_LIMIT)(
					{jobType: 'fail', handleFunction}
				)
			],
			AsyncStorage(EMPTY_STATE)
		)

		client.createJob('fail')()
		await sleep(20)

		expect(spy.mock.calls.length).toBe(RUNS_LIMIT)
	})
})