export type JobSubscription = (jobState: string) => void
export type RemoveSubscription = () => void

export function JobSubscriptions() {
	const subscriptions: {[key: string]: Set<JobSubscription>} = {}

	// public
	function addSubscription(jobId: string, subscription: JobSubscription): RemoveSubscription {
		if (subscriptions[jobId]) {
			subscriptions[jobId].add(subscription)
		} else {
			subscriptions[jobId] = new Set([subscription])
		}

		return () => subscriptions[jobId].delete(subscription)
	}

	// public
	function runSubscriptions(jobId: string, jobState: any): void {
		subscriptions[jobId].forEach(subscription => subscription(jobState))
	}

	// public
	function removeSubscriptions(jobId: string): void {
		delete subscriptions[jobId]
	}

	return {
		addSubscription,
		runSubscriptions,
		removeSubscriptions,
	}
}