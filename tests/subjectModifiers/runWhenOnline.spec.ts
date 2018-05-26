import 'babel-polyfill';
import uuid from 'uuid'
import runWhenOnline from '../../src/streamModifiers/runWhenOnline'
import {Subject} from 'rxjs'

function NetInfo() {
	const listeners = []

	// public
	function addEventListener(type, handler) {
		if (type != 'connectionChange') throw "This mock supports only 'connectionChange' events"

		listeners.push(handler)
	}
	
	// public
	function addEvent(value) {
		listeners.forEach(h => h(!!value))
	}

	// public
	function fetch() {
		return Promise.resolve(true)
	}

	return {
		isConnected: {
			addEventListener,
			addEvent,
			fetch
		}
	}
}

const sleep = time => new Promise(res => setTimeout(() => res(), time))
const FunctionId = f => ({
	id: uuid.v4(),
	handleFunction: f
})
describe('Jobs run only when online', () => {
	it('When online runs, when offline doesnt', async () => {
		const stream = new Subject()
		const spy = jest.fn()
		const netInfo = NetInfo()
		runWhenOnline(netInfo)(stream.asObservable()).subscribe(job => job.handleFunction())
		
		stream.next(
			FunctionId(() => spy('first'))
		)
		await sleep(1)

		expect(spy.mock.calls.length).toBe(1)
		expect(spy.mock.calls[0][0]).toBe('first')

		netInfo.isConnected.addEvent(false)

		stream.next(
			FunctionId(() => spy('second'))
		)
		await sleep(1)

		expect(spy.mock.calls.length).toBe(1)
		expect(spy.mock.calls[0][0]).toBe('first')

		netInfo.isConnected.addEvent(true)
		await sleep(1)

		expect(spy.mock.calls.length).toBe(2)
		expect(spy.mock.calls[1][0]).toBe('second')
	})
})