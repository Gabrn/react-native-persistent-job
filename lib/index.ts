import {Subject} from 'rxjs'
import {AsyncStorage} from 'react-native'
import {PersistentJobClient as _PersistentJobClient, PersistentJobClientType} from './persistentJobClient'
import _transformAsyncStorage from './utils/transformAsyncStorage'
import {JobNumbered, JobHandler} from './jobTypes'
import * as _streamModifiers from './streamModifiers'
import * as _jobHandlerModifiers from './jobHandlerModifiers'
export const transformAsyncStorage = _transformAsyncStorage
export const PersistentJobClient = _PersistentJobClient
export const streamModifiers = _streamModifiers
export const jobHandlerModifiers = _jobHandlerModifiers

type Params = {
	storeName?: string, 
	jobHandlers: JobHandler[], 
	modifyJobStream?: (jobSubject: Subject<JobNumbered>) => Subject<JobNumbered>,
	modifyRetryStream?: (retrySubject: Subject<JobNumbered>) => Subject<JobNumbered>,
	concurrencyLimit?: number,
}

const storesMap = new Map<string, PersistentJobClientType>()

export default {
	async initializeStore({storeName, jobHandlers, modifyJobStream, modifyRetryStream, concurrencyLimit}: Params): Promise<PersistentJobClientType> {
		const storeNameWithDefault = storeName || 'default'
		const client =  await PersistentJobClient(
			storeNameWithDefault, 
			jobHandlers, 
			transformAsyncStorage(AsyncStorage),
			modifyJobStream, 
			modifyRetryStream,
			concurrencyLimit
		)

		storesMap.set(storeNameWithDefault, client)

		return client
	},
	store(storeName?: string): PersistentJobClientType {
		const storeNameWithDefault = storeName || 'default'
		
		if (!storesMap.has(storeNameWithDefault)) {
			throw `Store ${storeNameWithDefault} is not initialized. call initializeStore({storeName?: string, jobHandlers: JobHandler[], asyncStorage: AsyncStorageStatic})`
		} 

		return <PersistentJobClientType>storesMap.get(storeNameWithDefault)
	}
}