import {AsyncStorage} from '../jobPersistence'
import {AsyncStorageStatic} from 'react-native'

export default (
	asyncStorage: AsyncStorageStatic
): AsyncStorage => {

	const serializeItem = (item: any) => {
		if (typeof item === 'object') {
			return JSON.stringify(item)
		} else {
			return item + ''
		}
	}

	// public
	async function getItem(key: string) {
		const serializedData = <string> await asyncStorage.getItem(key)
		try {
			return JSON.parse(serializedData)
		} catch (e) {
			return parseInt(serializedData) || serializedData
		}
	}

	// public
	async function setItem(key: string, value: any) {
			asyncStorage.setItem(key, serializeItem(value))
	}

	// public
	async function multiSet(keyValuePairs: {key: string, value: any}[]) {
		if (keyValuePairs.length === 0) return;
		const pairsAsArray = keyValuePairs.map(({key, value}) => [key, serializeItem(value)])
		await asyncStorage.multiSet(pairsAsArray)
	}

	// public
	async function multiRemove(keys: string[]) {
		if (keys.length === 0) return;
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