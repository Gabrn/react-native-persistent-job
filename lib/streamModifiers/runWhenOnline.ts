import {NetInfo} from 'react-native'
import {Subject, Observable} from 'rxjs'
import {JobNumbered} from '../jobTypes'
import {StreamModifier} from './types'

const runWhenOnline = (netInfo: NetInfo) => (composedModifier: StreamModifier) => (subject: Subject<JobNumbered>) => {
	const modifiedSubject = composedModifier(subject).asObservable()
	const netInfoObservable: Observable<boolean> = Observable.fromEventPattern(h => netInfo.isConnected.addEventListener('change', <(r: boolean) => void>h))
  const conectivityObservable: Observable<boolean> = Observable.merge(
    Observable.fromPromise(netInfo.isConnected.fetch()),
    netInfoObservable
 )

	const obs = Observable
		.combineLatest(modifiedSubject, conectivityObservable, (job, isConnected) => ({job, isConnected}))
		.flatMap(
			({job, isConnected}) => 
				isConnected ? 
					Observable.of(job) : 
					netInfoObservable.filter(connectionIsBack => connectionIsBack).first().map(_ => job)
		)
		.distinct()

	return obs
}

export default runWhenOnline