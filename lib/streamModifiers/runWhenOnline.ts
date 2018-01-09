import { NetInfo } from 'react-native'
import { Observable } from 'rxjs'
import { JobNumbered } from '../jobTypes'

const runWhenOnline = (netInfo: NetInfo) => (subject: Observable<JobNumbered>) => {
	const netInfoObservable: Observable<boolean> = Observable.fromEventPattern(h => netInfo.isConnected.addEventListener('connectionChange', <(r: boolean) => void>h))
	const connectivityObservable: Observable<boolean> = Observable.merge(
		Observable.fromPromise(netInfo.isConnected.fetch()),
		netInfoObservable
	)

	const obs = Observable
		.combineLatest(subject, connectivityObservable, (job, isConnected) => ({ job, isConnected }))
		.flatMap(
		({ job, isConnected }) =>
			isConnected ?
				Observable.of(job) :
				netInfoObservable.filter(connectionIsBack => connectionIsBack).first().map(_ => job)
		)
		.distinct(job => job.id)

	return obs
}

export default runWhenOnline