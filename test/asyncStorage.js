export default obj => {

	// public
	async function getItem(key) {
		return  obj[key]
	}

	// public
	async function setItem(key, item) {
		obj[key] = item
	}
	
	// public
	async function removeItem(key) {
		obj[key] = undefined
	}

	// public
	async function multiRemove(keys) {
		keys.forEach(key => removeItem(key))
	}

	// public
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