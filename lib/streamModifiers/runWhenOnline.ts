import {NetInfo} from 'react-native'
import {Observable} from 'rxjs'
import {JobNumbered} from '../jobTypes'

const runWhenOnline = (netInfo: NetInfo) => (subject: Observable<JobNumbered>) => {
	const netInfoObservable: Observable<boolean> = Observable.fromEventPattern(h => netInfo.isConnected.addEventListener('change', <(r: boolean) => void>h))
  const conectivityObservable: Observable<boolean> = Observable.merge(
    Observable.fromPromise(netInfo.isConnected.fetch()),
    netInfoObservable
 )

	const obs = Observable
		.combineLatest(subject, conectivityObservable, (job, isConnected) => ({job, isConnected}))
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