export type JobSubscription = (jobState: any) => void
export type RemoveSubscription = () => void

type JobSubscriptionNotification = {
	jobState: 'JOB_STARTED' | 'JOB_DONE' | 'JOB_NOT_FOUND' | 'JOB_INTERMEDIATE' | 'JOB_FAILED', 
	value?: any
}

export function JobSubscriptions() {
	const subscriptions: {[topic: string]: Set<JobSubscription>} = {}

	// public
	function addSubscription(topic: string, subscription: JobSubscription): RemoveSubscription {
		if (subscriptions[topic]) {
			subscriptions[topic].add(subscription)
		} else {
			subscriptions[topic] = new Set([subscription])
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
	}

	return {
		addSubscription,
		notifySubscriptions,
		removeSubscriptions,
	}
}