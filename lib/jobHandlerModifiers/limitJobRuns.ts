import {
	HandleFunctionStateful, 
	HandleFuncitonStateless, 
	JobHandler, 
	JobHandlerStateful,
} from "../jobTypes"

const makeStateful = (statelessFunction: HandleFuncitonStateless) => () => (...args) => statelessFunction(...args)

const withMaxRetries = (maxRetries: number) => 
(statefulFunction: HandleFunctionStateful): HandleFunctionStateful => 
(currentState, updateState) => 
async (...args) => {
	const state = currentState || {retryCount: 0}
	const retryCount = state.retryCount || 0
	if (retryCount >= maxRetries) return;

	const updateStateWithRetries = state => updateState({...state, retryCount})
	const {retryCount: _, ...stateWithoutRetries} = state

	try {
		return await statefulFunction(stateWithoutRetries, updateStateWithRetries)(...args)
	} catch (e) {
		await updateState({...state, retryCount: retryCount + 1})
		throw e
	}
 }

export default (maxRetries: number) => (handler: JobHandler): JobHandlerStateful => {
	if (handler.isStateful) {
		return {
			...handler, 
			handleFunction: withMaxRetries(maxRetries)(handler.handleFunction)
		}
	} else {
		return {
			...handler,
			isStateful: true,
			handleFunction: withMaxRetries(maxRetries)(makeStateful(handler.handleFunction))
		}
	}
}