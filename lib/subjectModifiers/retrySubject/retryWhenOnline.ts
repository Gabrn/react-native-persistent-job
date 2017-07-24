import {Subject, Observable} from 'rxjs'
import {Job} from '../../jobTypes'

const retryWhenOnline = (NetInfo) => (subject: Subject<Job>) => {
	const connectivitySubject = new Subject<boolean>()

	NetInfo.isConnected.addEventListener(
		'change',
		isConnected => connectivitySubject.next(isConnected)
	);

	const obs = Observable
		.combineLatest(subject, connectivitySubject, (job, isConnected) => ({job, isConnected}))
		.flatMap(
			({job, isConnected}) => 
				isConnected ? 
					Observable.of(job) : 
					connectivitySubject.filter(isConnected => isConnected).first().map(_ => job)
		)

	return obs
}

export default retryWhenOnline