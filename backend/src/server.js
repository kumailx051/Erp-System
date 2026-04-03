const app = require('./app');
const { initializeDatabase } = require('./core/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
	try {
		await initializeDatabase();

		app.listen(PORT, () => {
			console.log(`Server is running on http://localhost:${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error.message);
		process.exit(1);
	}
}

startServer();
