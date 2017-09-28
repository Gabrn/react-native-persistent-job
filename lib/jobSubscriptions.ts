export type JobSubscription = (jobState: any) => void
export type RemoveSubscription = () => void

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
	function notifySubscriptions(topic: string, jobState: any): void {
		subscriptions[topic].forEach(subscription => subscription(jobState))
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