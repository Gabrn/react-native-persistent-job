import runWhenOnline from '../../src/streamModifiers/runWhenOnline'
import {Subject} from 'rxjs'

function NetInfo() {
	const listeners = []

	// public
	function addEventListener(type, handler) {
		if (type != 'change') throw "This mock supports only 'change' events"

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

describe('Jobs run only when the device is online', () => {
	it('When online runs, when ofline doesnt', async () => {
		const stream = new Subject()
		const spy = jest.fn()
		const netInfo = NetInfo()
		const a = runWhenOnline(netInfo)(x=>x)(stream).subscribe(h => h())
		
		
		stream.next(() => spy('first'))
		await sleep(1)

		expect(spy.mock.calls.length).toBe(1)
		expect(spy.mock.calls[0][0]).toBe('first')

		netInfo.isConnected.addEvent(false)

		stream.next(() => spy('second'))
		await sleep(1)

		expect(spy.mock.calls.length).toBe(1)
		expect(spy.mock.calls[0][0]).toBe('first')

		netInfo.isConnected.addEvent(true)
		await sleep(1)

		expect(spy.mock.calls.length).toBe(2)
		expect(spy.mock.calls[1][0]).toBe('second')
	})
})