import {AsyncStorageStatic} from 'react-native'
import {PersistentJobClient as _PersistentJobClient, PersistentJobClientType} from './persistentJobClient'
import _transformAsyncStorage from './utils/transformAsyncStorage'
import {JobHandler} from './jobTypes'

export const transformAsyncStorage = _transformAsyncStorage
export const PersistentJobClient = _PersistentJobClient

type Params = {
	storeName?: string, 
	jobHandlers: JobHandler[], 
	asyncStorage: AsyncStorageStatic
}

const storesMap = new Map<string, PersistentJobClientType>()

export default {
	async initializeApp({storeName, jobHandlers, asyncStorage}: Params): Promise<PersistentJobClientType> {
		const storeNameWithDefault = storeName || 'default'
		const client =  await PersistentJobClient(
			storeNameWithDefault, 
			jobHandlers, 
			transformAsyncStorage(asyncStorage)
		)

		storesMap.set(storeNameWithDefault, client)

		return client
	},
	app(storeName?: string): PersistentJobClientType {
		const storeNameWithDefault = storeName || 'default'
		
		if (!storesMap.has(storeNameWithDefault)) {
			throw `Store ${storeNameWithDefault} is not initialized. call initializeApp({storeName?: string, jobHandlers: JobHandler[], asyncStorage: AsyncStorageStatic})`
		} 

		return <PersistentJobClientType>storesMap.get(storeNameWithDefault)
	}
}