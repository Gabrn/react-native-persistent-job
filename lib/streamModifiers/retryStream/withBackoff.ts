import {Observable} from 'rxjs'
import {JobNumbered} from '../../jobTypes'

type JobWithRetries = JobNumbered & { retryNumber?: number}
type BackoffMethod = (retryNumber: number) => number

const waitedJob = (job: JobWithRetries, timeToWait: number) => new Promise(res => setTimeout(() => res(job), timeToWait))
const backoffStream = (backoffMethod: BackoffMethod) => (subject: Observable<JobWithRetries>) =>  {
	return subject
		.map(job => {
			const jobWithRetries = <JobWithRetries>job

			return jobWithRetries.retryNumber 
				? {...jobWithRetries, retryNumber: jobWithRetries.retryNumber + 1} 
				: {...jobWithRetries, retryNumber: 1} 
		})
		.flatMap(async job => waitedJob(job, backoffMethod(job.retryNumber - 1)))
}

const exponentialBackoffMethod = (initialWaitTime: number, maxWaitTime?: number) => (retryNumber: number) => {
	const waitTime = initialWaitTime * Math.pow(2, retryNumber)

	return maxWaitTime && maxWaitTime < waitTime 
		? maxWaitTime
		: waitTime
}

const fibonacci = (index: number): number => {
	if (index === 0) return 1
	if (index === 1) return 1

	return fibonacci(index - 1) + fibonacci(index - 2)
}

const fibonacciBackoffMethod = (initialWaitTime: number, maxWaitTime?: number) => (retryNumber: number) => {
	const waitTime = initialWaitTime * fibonacci(retryNumber + 1)

	return maxWaitTime && maxWaitTime < waitTime 
		? maxWaitTime
		: waitTime
}

const withBackoff = {
	exponential: (initialWaitTime: number, maxWaitTime?: number) =>  backoffStream(exponentialBackoffMethod(initialWaitTime, maxWaitTime)),
	fibonacci: (initialWaitTime: number, maxWaitTime?: number) =>   backoffStream(fibonacciBackoffMethod(initialWaitTime, maxWaitTime))
}

export default withBackoff