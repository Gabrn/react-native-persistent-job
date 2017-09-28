import {AsyncStorage} from '../jobPersistence'
import {AsyncStorage as AsyncStorageReactNative} from 'react-native'

export default (
	asyncStorage: AsyncStorageReactNative
): AsyncStorage => {
	const cachedStorage = {}
	
	const serializeItem = (item: any) => {
		if (typeof item === 'object') {
			return JSON.stringify(item)
		} else {
			return item + ''
		}
	}

	// public
	async function getItem(key: string) {
		if (cachedStorage[key]) {
			return cachedStorage[key]
		}
		
		const serializedData = <string> await asyncStorage.getItem(key)

		let value: {} | string | number

		try {
			value = JSON.parse(serializedData)
			cachedStorage[key] = value
		} catch (e) {
			value = parseInt(serializedData) || serializedData
			cachedStorage[key] = value
		}

		return value
	}

	// public
	async function setItem(key: string, value: any) {
			cachedStorage[key] = value
			asyncStorage.setItem(key, serializeItem(value))
	}

	// public
	async function multiSet(keyValuePairs: {key: string, value: any}[]) {
		if (keyValuePairs.length === 0) return;
		keyValuePairs.forEach(({key, value}) => cachedStorage[key] = value)
		const pairsAsArray = keyValuePairs.map(({key, value}) => [key, serializeItem(value)])
		await asyncStorage.multiSet(pairsAsArray)
	}

	// public
	async function multiRemove(keys: string[]) {
		if (keys.length === 0) return;
		keys.forEach(key => delete cachedStorage[key])
		await asyncStorage.multiRemove(keys)
	}

	return {
		removeItem: asyncStorage.removeItem,
		multiRemove,
		getItem,
		setItem,
		multiSet
	}
}