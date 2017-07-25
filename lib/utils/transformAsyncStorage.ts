import {AsyncStorage} from '../jobPersistence'

export default (asyncStorage: AsyncStorage): AsyncStorage => {
	const getItem = async (key: string) => {
		const serializedData = <string> await asyncStorage.getItem(key)
		try {
			return JSON.parse(serializedData)
		} catch (e) {
			return parseInt(serializedData) || serializedData
		}
	}

	const setItem = async (key: string, value: any) => {
		if (typeof value === 'object') {
			asyncStorage.setItem(key, JSON.stringify(value))
		} else {
			asyncStorage.setItem(key, value + '')
		}
	}

	return {
		getItem,
		setItem,
		removeItem: asyncStorage.removeItem
	}
}