export default obj => ({
	getItem: async (key) => obj[key],
	setItem: async (key, item) => {
		let resolve = null
		const p = new Promise(res => resolve = res)
		obj[key] = item
	}
})