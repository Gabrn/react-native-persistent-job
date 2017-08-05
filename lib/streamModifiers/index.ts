import {NetInfo} from 'react-native'
import _runWhenOnline from './runWhenOnline'
import * as _retryStream from './retryStream'
import {StreamModifier} from './types'

export const runWhenOnline = _runWhenOnline(NetInfo)
export const retryStream = _retryStream
export const compose = (...streamModifiers: StreamModifier[]): StreamModifier => {
	return (originalObservable) => streamModifiers.reduce(
		(composedObservable, current) => current(composedObservable),
		originalObservable
	)
}