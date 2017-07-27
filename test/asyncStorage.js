export default obj => {
	
	async function getItem(key) {
		return  obj[key]
	}

	async function setItem(key, item) {
		obj[key] = item
	}
	
	async function removeItem(key) {
		obj[key] = undefined
	}

	async function multiRemove(keys) {
		keys.forEach(key => removeItem(key))
	}

	async function multiSet(keyValuePairs) {
		keyValuePairs.forEach(pair => setItem(pair.key, pair.value))
	}

	return {
		getItem,
		setItem,
		removeItem,
		multiRemove,
		multiSet
	}
}