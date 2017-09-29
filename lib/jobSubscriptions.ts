import {
	Job,
} from './jobTypes'

export type JobSubscription = (jobState: any) => void
export type RemoveSubscription = () => void

type JobSubscriptionNotification = {
	jobState: 'JOB_STARTED' | 'JOB_DONE' | 'JOB_NOT_FOUND' | 'JOB_INTERMEDIATE' | 'JOB_FAILED', 
	value?: any
}

export function JobSubscriptions() {
	const topics: {[topic: string]: Job} = {}
	const subscriptions: {[topic: string]: Set<JobSubscription>} = {}

	// public
	function addTopic(topic: string, job: Job): void {
		topics[topic] = job
	}

	// public
	function addSubscription(topic: string, subscription: JobSubscription): RemoveSubscription {
		if (subscriptions[topic]) {
			subscriptions[topic].add(subscription)
		} else {
			subscriptions[topic] = new Set([subscription])
		}

		const job = topics[topic]

		if (job) {
			if (job.state) {
				subscription({jobState: 'JOB_INTERMEDIATE', value: job.state})
			} else {
				subscription({jobState: 'JOB_STARTED'})
			}
		} else {
			subscription({jobState: 'JOB_NOT_FOUND'})
		}

		return () => subscriptions[topic].delete(subscription)
	}

	// public
	function notifySubscriptions(topic: string, notification: JobSubscriptionNotification): void {
		subscriptions[topic].forEach(subscription => subscription(notification))
	}

	// public
	function removeSubscriptions(topic: string): void {
		delete subscriptions[topic]
		delete topics[topic]
	}

	return {
		addSubscription,
		notifySubscriptions,
		removeSubscriptions,
		addTopic,
	}
}