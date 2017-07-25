export default obj => ({
	getItem: async (key) => obj[key],
	setItem: async (key, item) => {
		obj[key] = item
	},
	removeItem: async (key) => {
		obj[key] = undefined
	}
})