export async function GET() {
	return new Response(JSON.stringify({
		status: 'ok',
		timestamp: new Date().toISOString(),
		message: 'Application is running'
	}), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}